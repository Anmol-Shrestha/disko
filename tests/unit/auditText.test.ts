import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseAuditText, parseHumanSize } from '../../src/main/scanner/auditText'
import { formatBytes } from '../../src/shared/format'
import { SECTION_ORDER, type SectionId } from '../../src/shared/types'

const HOME = '/Users/anmolsagarshrestha'
const text = readFileSync(join(__dirname, '../fixtures/mock-audit.txt'), 'utf8')
const snapshot = parseAuditText(text, HOME)

const inSection = (id: SectionId) => snapshot.items.filter((i) => i.section === id)
const byPath = (path: string) => snapshot.items.find((i) => i.path === path)

describe('sizes', () => {
  it.each([
    ['0B', 0],
    ['24K', 24 * 1024],
    ['4.0K', 4096],
    ['161M', 161 * 1024 ** 2],
    ['7.9G', Math.round(7.9 * 1024 ** 3)],
    ['228Gi', 228 * 1024 ** 3],
  ])('%s → %i bytes', (input, expected) => {
    expect(parseHumanSize(input)).toBe(expected)
  })

  it('rejects text that is not a size', () => {
    expect(() => parseHumanSize('lots')).toThrow(/Not a size/)
  })

  it('formats bytes in base 1000 like Finder', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1500)).toBe('1.5 KB')
    expect(formatBytes(15_000_000_000)).toBe('15 GB')
  })
})

describe('disk overview', () => {
  it('reads the df line into exact fields', () => {
    expect(snapshot.disk).toEqual({
      device: '/dev/disk3s1s1',
      mount: '/',
      totalBytes: 228 * 1024 ** 3,
      usedBytes: 16 * 1024 ** 3,
      freeBytes: 15 * 1024 ** 3,
      capacityPercent: 51,
    })
  })
})

describe('local snapshots', () => {
  it('lists all three and flags the pending macOS update', () => {
    expect(snapshot.localSnapshots).toHaveLength(3)
    const pending = snapshot.localSnapshots.filter((s) => s.pendingMacOSUpdate)
    expect(pending.map((s) => s.name)).toEqual(['com.apple.os.update-MSUPrepareUpdate'])
  })
})

describe('sections', () => {
  it('has every section from audit.txt, and nothing else', () => {
    const found = new Set(snapshot.items.map((i) => i.section))
    expect([...found].sort()).toEqual([...SECTION_ORDER].sort())
  })

  it('keeps the row counts of the audit', () => {
    expect(inSection('knownSpaceHogs')).toHaveLength(21)
    expect(inSection('libraryTop')).toHaveLength(15)
    expect(inSection('applicationSupportTop')).toHaveLength(15)
    expect(inSection('cachesTop')).toHaveLength(15)
    expect(inSection('dotFolders')).toHaveLength(15)
    expect(inSection('nodeModules')).toHaveLength(15)
    expect(inSection('pythonVenvs')).toHaveLength(15)
  })

  it('keeps the audit order, biggest first', () => {
    for (const id of SECTION_ORDER) {
      const sizes = inSection(id).map((i) => i.bytes)
      expect(sizes).toEqual([...sizes].sort((a, b) => b - a))
    }
  })

  it('every item has what, where, how much and safety', () => {
    for (const item of snapshot.items) {
      expect(item.what.length).toBeGreaterThan(0)
      expect(item.path.startsWith('/')).toBe(true)
      expect(Number.isInteger(item.bytes)).toBe(true)
      expect(item.safety.reason.length).toBeGreaterThan(0)
    }
  })
})

describe('classification of the real audit', () => {
  it('marks ShipIt update leftovers and browser caches as safe (tier 1)', () => {
    const shipIt = byPath(`${HOME}/Library/Caches/com.microsoft.VSCode.ShipIt`)
    expect(shipIt?.safety.tier).toBe(1)
    expect(shipIt?.safety.recommended).toBe('remove')
    expect(byPath(`${HOME}/Library/Caches/Mozilla`)?.safety.tier).toBe(1)
  })

  it('marks package caches as safe (tier 1)', () => {
    expect(byPath(`${HOME}/.npm`)?.safety.tier).toBe(1)
    expect(byPath(`${HOME}/Library/Caches/pip`)?.what).toBe('pip cache')
  })

  it('marks node_modules and venvs for review (tier 2), never remove by default', () => {
    const nm = inSection('nodeModules')[0]
    expect(nm.safety.tier).toBe(2)
    expect(nm.safety.recommended).toBe('review')
    const venv = inSection('pythonVenvs')[0]
    expect(venv.safety.tier).toBe(2)
    expect(venv.category).toBe('Project environments')
  })

  it('marks app data and Mail as keep (tier 3)', () => {
    expect(byPath(`${HOME}/Library/Application Support/Google`)?.safety.tier).toBe(3)
    expect(byPath(`${HOME}/Library/Mail`)?.safety.tier).toBe(3)
    expect(byPath(`${HOME}/Library/Mail`)?.safety.recommended).toBe('keep')
  })

  it('leaves unexplained folders unknown, so they get a Drill down action', () => {
    const vscode = byPath(`${HOME}/.vscode`)
    expect(vscode?.safety.tier).toBe('unknown')
    expect(vscode?.safety.recommended).toBe('review')
    expect(vscode?.bytes).toBe(23 * 1024 ** 3)
  })
})

describe('guards', () => {
  it('fails loudly on a section it does not know, so a changed script is noticed', () => {
    expect(() => parseAuditText('=== Something new ===\n  1G  /Users/x/y\n', '/Users/x')).toThrow(
      /Unknown audit section/,
    )
  })

  it('finds the home folder from the paths when none is given', () => {
    expect(parseAuditText(text).home).toBe(HOME)
  })
})
