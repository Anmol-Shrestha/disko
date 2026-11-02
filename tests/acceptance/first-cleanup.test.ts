/**
 * Acceptance test: "the first cleanup".
 *
 * Replays the manual session of 1 Nov 2026 (see docs/DECISIONS.md) against a
 * fake home folder built from the real audit. If DiskPilot passes this test,
 * it reaches the same conclusions we reached by hand, and it is safer.
 *
 * Imports below are the target APIs from CLAUDE.md / PLAN.md. They don't
 * exist yet: when a module lands, adjust the import path if needed, but keep
 * the assertions. Each `describe` notes the phase that makes it pass.
 * Never point this test at the real home folder.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdtempSync, readdirSync, rmSync, statSync, utimesSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { scan } from '../../src/main/scanner'
import { drillDown } from '../../src/main/scanner/drillDown'
import { duplicateVersions } from '../../src/main/scanner/detectors/duplicateVersions'
import { renderAuditTxt } from '../../src/main/scanner/report'
import { planCleanup } from '../../src/main/cleanup/planner'
import { checkPath } from '../../src/main/cleanup/guard'
import { executePlan, issueApproval } from '../../src/main/cleanup/executor'
import { classifyCommand } from '../../src/main/pty/commandPolicy'
import type { AuditItem, AuditSnapshot } from '../../src/shared/types'

import { ENTRIES, EXTENSIONS, SCALE, STALE_PROJECTS, buildFakeHome } from '../fixtures/first-cleanup'

const NOW = new Date('2026-11-01T17:00:00-05:00')
const DAY = 24 * 60 * 60 * 1000

let root: string
let home: string
let snapshot: AuditSnapshot

/** Marks every file under `dir` as last modified `days` ago. */
function age(dir: string, days: number): void {
  const t = new Date(NOW.getTime() - days * DAY)
  const walk = (p: string): void => {
    utimesSync(p, t, t)
    if (statSync(p).isDirectory()) for (const c of readdirSync(p)) walk(join(p, c))
  }
  walk(dir)
}

const itemAt = (rel: string): AuditItem | undefined =>
  snapshot.items.find((i) => i.path === join(home, rel))

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'diskpilot-first-cleanup-'))
  home = buildFakeHome(root)
  for (const p of STALE_PROJECTS) age(join(home, p), 120) // school labs: untouched for months
  age(join(home, 'radiocalico'), 2) // active project
  snapshot = await scan({ home, now: NOW })
})

afterAll(() => rmSync(root, { recursive: true, force: true }))

// ---------------------------------------------------------------------------
describe('Phase 1 · audit: every item answers the four questions', () => {
  it('produces one snapshot with exact byte sizes', () => {
    expect(snapshot.items.length).toBeGreaterThan(0)
    for (const item of snapshot.items) expect(Number.isInteger(item.bytes)).toBe(true)
  })

  it.each(ENTRIES.map((e) => [e.path, e] as const))('%s: what, where, how much, safe?', (rel, e) => {
    const item = itemAt(rel)
    expect(item, `scanner missed ${rel}`).toBeDefined()
    // What
    expect(item!.what.length).toBeGreaterThan(0)
    if (e.expect.what) {
      expect(`${item!.what} ${item!.safety.reason}`.toLowerCase()).toContain(e.expect.what.toLowerCase())
    }
    // Where
    expect(item!.path).toBe(join(home, rel))
    // How much (du rounds to blocks: allow 10% + one 4 KB block)
    expect(item!.bytes).toBeGreaterThanOrEqual(e.gb * SCALE * 0.9)
    expect(item!.bytes).toBeLessThanOrEqual(e.gb * SCALE * 1.1 + 4096)
    // Safe to delete?
    expect(item!.safety.tier).toBe(e.expect.tier)
    expect(item!.safety.reason.length).toBeGreaterThan(0)
  })

  it('writes audit.txt, the only context Claude gets, with the four answers', () => {
    const txt = renderAuditTxt(snapshot)
    expect(txt).toContain(join(home, '.cache/uv'))
    expect(txt.toLowerCase()).toMatch(/safe|tier/)
    // Everything that matters must be in it: the .vscode cause and the app data to keep
    expect(txt).toContain(join(home, '.vscode/extensions'))
    expect(txt).toContain('WhatsApp')
  })
})

// ---------------------------------------------------------------------------
describe('Phase 1 · drill down: the .vscode case', () => {
  it('reports the extensions folder as the cause, not .vscode itself', async () => {
    const level1 = await drillDown(join(home, '.vscode'), { home, depth: 1, now: NOW })
    expect(level1[0].path).toBe(join(home, '.vscode/extensions'))
  })

  it('flags exactly the stale extension versions and keeps every in-use one', async () => {
    const found = await duplicateVersions(join(home, '.vscode/extensions'))
    const flagged = found.map((i) => i.path.split('/').pop()).sort()
    expect(flagged).toEqual([...EXTENSIONS.stale].sort())
    for (const name of EXTENSIONS.inUse) expect(flagged).not.toContain(name)
    for (const item of found) expect(item.safety.reason).toMatch(/extensions\.json|not in use|older version/i)
  })

  it('the snapshot already includes the detector results (no manual drilling next time)', () => {
    const stale = snapshot.items.filter((i) => i.path.startsWith(join(home, '.vscode/extensions/')) && i.safety.tier === 2)
    expect(stale).toHaveLength(EXTENSIONS.stale.length)
  })
})

// ---------------------------------------------------------------------------
describe('Phase 3 · safety guard', () => {
  it.each([
    ['/System/Library/CoreServices', 'outside home'],
    ['/private/var/vm', 'outside home'],
    ['Library/Application Support/Google/Chrome', 'app data'],
    ['Library/Group Containers/group.net.whatsapp.WhatsApp.shared', 'app data'],
    ['Library/Keychains', 'never touch'],
    ['.cache/uv/../../Library/Keychains', 'path traversal'],
  ])('rejects %s (%s)', (p) => {
    const abs = p.startsWith('/') ? p : join(home, p)
    expect(checkPath(abs, { home }).ok).toBe(false)
  })

  it('accepts a Tier 1 cache', () => {
    expect(checkPath(join(home, '.cache/uv'), { home }).ok).toBe(true)
  })
})

// ---------------------------------------------------------------------------
describe('Phase 3 · plan → approve → execute (Trash only)', () => {
  const trashed: string[] = []
  const fakeTrash = async (p: string): Promise<void> => {
    trashed.push(p)
  }

  it('a plan of Tier 1 + stale Tier 2 items matches what we removed by hand', () => {
    const toRemove = snapshot.items.filter((i) => i.safety.tier === 1 || (i.safety.tier === 2 && i.safety.recommended === 'remove'))
    const plan = planCleanup(snapshot, toRemove.map((i) => i.path))

    const expected = ENTRIES.filter((e) => e.expect.remove).map((e) => join(home, e.path))
    for (const p of expected) expect(plan.items.map((i) => i.path)).toContain(p)
    for (const e of ENTRIES.filter((x) => !x.expect.remove)) {
      expect(plan.items.map((i) => i.path)).not.toContain(join(home, e.path))
    }
    expect(plan.items.map((i) => i.path)).not.toContain(join(home, '.nvm/versions/node/v22.17.1'))
  })

  it('refuses to run a plan without a UI-issued approval', async () => {
    const plan = planCleanup(snapshot, [join(home, '.cache/uv')])
    await expect(executePlan(plan, 'forged-token', { trash: fakeTrash, home })).rejects.toThrow(/approv/i)
    expect(trashed).toHaveLength(0)
  })

  it('moves approved items to the Trash and deletes nothing directly', async () => {
    const plan = planCleanup(snapshot, [join(home, '.cache/uv'), join(home, '.cache/selenium')])
    const token = issueApproval(plan.id) // in the app, only the UI can call this
    const result = await executePlan(plan, token, { trash: fakeTrash, home, runTool: async () => ({ ok: false }) })

    expect(trashed.sort()).toEqual([join(home, '.cache/selenium'), join(home, '.cache/uv')].sort())
    expect(existsSync(join(home, '.cache/uv'))).toBe(true) // fake trash: still on disk, so nothing was rm'd
    expect(result.freedBytes).toBeGreaterThan(0)
  })

  it('removes the stray .DS_Store before pnpm store prune (session gotcha)', () => {
    const plan = planCleanup(snapshot, [join(home, 'Library/Caches/pnpm')])
    const pnpm = plan.items.find((i) => i.path === join(home, 'Library/Caches/pnpm'))!
    expect(pnpm.preSteps ?? []).toContainEqual(expect.stringContaining('.DS_Store'))
  })

  it('freed space is mostly the extension duplicates and caches, as in the real session', () => {
    const toRemove = snapshot.items.filter((i) => i.safety.tier === 1 || (i.safety.tier === 2 && i.safety.recommended === 'remove'))
    const plan = planCleanup(snapshot, toRemove.map((i) => i.path))
    const keepTier3 = snapshot.items.filter((i) => i.safety.tier === 3).reduce((s, i) => s + i.bytes, 0)
    expect(plan.totalBytes).toBeGreaterThan(0)
    expect(keepTier3).toBeGreaterThan(0) // app data is still there afterwards
    expect(plan.items.every((i) => i.tier !== 3)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
describe('Phase 2 · command policy (commands from the real session)', () => {
  it.each([
    ['du -sh ~/.vscode/extensions/* | sort -rh | head -20', 'read-only'],
    ['df -h /', 'read-only'],
    ['tmutil listlocalsnapshots /', 'read-only'],
    ['uv cache clean', 'needs-approval'],
    ['npm cache clean --force', 'needs-approval'],
    ['brew cleanup -s', 'needs-approval'],
    ['pnpm store prune', 'needs-approval'],
    ['rm -rf ~/Library/Caches/Mozilla', 'blocked'],
    ['sudo tmutil deletelocalsnapshots 2026-11-01', 'blocked'],
    ['du -sh ~ > /tmp/out.txt', 'blocked'],
    ['ls $(rm -rf ~)', 'blocked'],
    ['find ~ -name node_modules -delete', 'blocked'],
    ['df -h; rm -rf ~/.cache', 'blocked'],
  ])('%s → %s', (cmd, expected) => {
    expect(classifyCommand(cmd)).toBe(expected)
  })
})
