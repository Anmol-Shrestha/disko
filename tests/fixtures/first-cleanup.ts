/**
 * Fixture: the owner's Mac before the first manual cleanup (1 Nov 2026),
 * rebuilt from the real audit.txt and the commands we ran.
 *
 * Sizes are scaled down so the fixture is a few MB on disk:
 *   1 GB on the real Mac = SCALE bytes here.
 * Tests compare rankings and ratios, never absolute sizes.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export const SCALE = 100_000 // bytes per real GB

export type Tier = 1 | 2 | 3 | 'unknown'

export interface FixtureEntry {
  /** Path relative to the fake home folder. */
  path: string
  /** Real size on the owner's Mac, in GB. */
  gb: number
  /** What the app should conclude about this item. */
  expect: {
    tier: Tier
    /** Should a correct cleanup plan include it (Tier 1 + approved Tier 2)? */
    remove: boolean
    /** Substring the item's `what` / reason should mention. */
    what?: string
  }
}

/** Extension folders: in use (listed in extensions.json) vs stale duplicates. */
export const EXTENSIONS = {
  inUse: [
    'openai.chatgpt-26.1021.22027-darwin-arm64',
    'anthropic.claude-code-2.1.312-darwin-arm64',
    'oracle.sql-developer-26.3.0-darwin-arm64',
    'google.geminicodeassist-2.101.0',
    'eamodio.gitlens-19.5.0',
  ],
  stale: [
    'openai.chatgpt-26.1007.21434-darwin-arm64',
    'openai.chatgpt-26.930.51102-darwin-arm64',
    'openai.chatgpt-26.908.40401-darwin-arm64',
    'anthropic.claude-code-2.1.311-darwin-arm64',
    'anthropic.claude-code-2.1.310-darwin-arm64',
    'oracle.sql-developer-26.2.1-darwin-arm64',
    'oracle.sql-developer-26.2.0-darwin-arm64',
    'google.geminicodeassist-2.100.0',
    'eamodio.gitlens-19.4.0',
    // uninstalled extension left behind: not in extensions.json at all
    'aaron-bond.better-comments-3.0.2',
  ],
} as const

export const ENTRIES: FixtureEntry[] = [
  // ---------- Tier 1: safe caches (cleared in the manual session) ----------
  { path: 'Library/Caches/com.microsoft.VSCode.ShipIt', gb: 1.5, expect: { tier: 1, remove: true, what: 'update' } },
  { path: 'Library/Caches/com.anthropic.claudefordesktop.ShipIt', gb: 0.83, expect: { tier: 1, remove: true, what: 'update' } },
  { path: 'Library/Caches/notion.id.ShipIt', gb: 0.32, expect: { tier: 1, remove: true, what: 'update' } },
  { path: 'Library/Caches/Mozilla', gb: 1.1, expect: { tier: 1, remove: true, what: 'browser' } },
  { path: 'Library/Caches/Firefox', gb: 0.9, expect: { tier: 1, remove: true, what: 'browser' } },
  { path: 'Library/Caches/pnpm', gb: 0.9, expect: { tier: 1, remove: true, what: 'pnpm' } },
  { path: 'Library/Caches/pip', gb: 0.68, expect: { tier: 1, remove: true, what: 'pip' } },
  { path: 'Library/Caches/pipenv', gb: 0.23, expect: { tier: 1, remove: true, what: 'pipenv' } },
  { path: 'Library/Caches/Homebrew', gb: 0.33, expect: { tier: 1, remove: true, what: 'brew' } },
  { path: '.npm/_cacache', gb: 1.5, expect: { tier: 1, remove: true, what: 'npm' } },
  { path: '.gradle/caches', gb: 6.5, expect: { tier: 1, remove: true, what: 'gradle' } },
  { path: '.gradle/wrapper/dists', gb: 0.6, expect: { tier: 1, remove: true, what: 'gradle' } },
  { path: '.cache/uv', gb: 3.6, expect: { tier: 1, remove: true, what: 'uv' } },
  { path: '.cache/selenium', gb: 0.4, expect: { tier: 1, remove: true, what: 'selenium' } },
  { path: '.cache/puppeteer', gb: 0.245, expect: { tier: 1, remove: true, what: 'puppeteer' } },
  { path: '.bun/install/cache', gb: 1.0, expect: { tier: 1, remove: true, what: 'bun' } },
  { path: 'Library/Application Support/Code/CachedData', gb: 1.2, expect: { tier: 1, remove: true, what: 'VS Code' } },
  { path: 'Library/Application Support/Code/Cache', gb: 0.4, expect: { tier: 1, remove: true, what: 'VS Code' } },

  // ---------- Tier 2: review per item ----------
  // Old Node versions; v22.17.1 is current (pnpm lives there) and must be kept
  { path: '.nvm/versions/node/v18.17.1', gb: 0.437, expect: { tier: 2, remove: true, what: 'Node' } },
  { path: '.nvm/versions/node/v22.12.0', gb: 0.219, expect: { tier: 2, remove: true, what: 'Node' } },
  { path: '.nvm/versions/node/v22.15.0', gb: 0.208, expect: { tier: 2, remove: true, what: 'Node' } },
  { path: '.nvm/versions/node/v22.17.1', gb: 0.351, expect: { tier: 2, remove: false, what: 'Node' } },
  // Project environments: stale school labs vs active projects
  { path: 'Documents/School/semester4/SupervisedLearning/.venv', gb: 0.405, expect: { tier: 2, remove: true, what: 'stale' } },
  { path: 'Documents/School/semester4/SupervisedLearning/Module4Lab/.venv', gb: 0.408, expect: { tier: 2, remove: true, what: 'stale' } },
  { path: 'radiocalico/backend/.venv', gb: 1.1, expect: { tier: 2, remove: false } },
  { path: 'radiocalico/frontend/node_modules', gb: 0.183, expect: { tier: 2, remove: false } },
  // ML models: user decides; the session kept them
  { path: '.cache/huggingface/hub/models--example', gb: 1.2, expect: { tier: 2, remove: false, what: 'model' } },

  // ---------- Tier 3: report only, never deleted by the app ----------
  { path: 'Library/Application Support/Google/Chrome', gb: 5.2, expect: { tier: 3, remove: false, what: 'Chrome' } },
  { path: 'Library/Application Support/Notion', gb: 3.1, expect: { tier: 3, remove: false } },
  { path: 'Library/Application Support/Firefox', gb: 4.0, expect: { tier: 3, remove: false } },
  { path: 'Library/Group Containers/group.net.whatsapp.WhatsApp.shared', gb: 5.4, expect: { tier: 3, remove: false, what: 'WhatsApp' } },
  { path: 'Library/Group Containers/UBF8T346G9.Office', gb: 0.9, expect: { tier: 3, remove: false } },
]

/** Real-Mac sizes of each extension folder, in GB. */
const EXT_GB = 0.5

/**
 * Creates the fake home folder under `root` and returns its path.
 * Writes one file per entry of `gb * SCALE` bytes (real data, not sparse,
 * so `du` measures it), plus the VS Code extensions folder and the
 * stray .DS_Store that broke `pnpm store prune`.
 */
export function buildFakeHome(root: string): string {
  const home = join(root, 'home')
  const writeBlob = (rel: string, gb: number): void => {
    const file = join(home, rel, 'blob.bin')
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, Buffer.alloc(Math.round(gb * SCALE), 1))
  }

  for (const e of ENTRIES) writeBlob(e.path, e.gb)

  // VS Code extensions: 15 folders, only the in-use ones referenced.
  const extDir = '.vscode/extensions'
  for (const name of [...EXTENSIONS.inUse, ...EXTENSIONS.stale]) {
    writeBlob(join(extDir, name), EXT_GB)
  }
  writeFileSync(
    join(home, extDir, 'extensions.json'),
    JSON.stringify(EXTENSIONS.inUse.map((relativeLocation) => ({ relativeLocation }))),
  )

  // Gotcha from the session: Finder metadata inside pnpm's dlx cache.
  mkdirSync(join(home, 'Library/Caches/pnpm/dlx'), { recursive: true })
  writeFileSync(join(home, 'Library/Caches/pnpm/dlx/.DS_Store'), 'x')

  // nvm's default alias: how the scanner knows v22.17.1 is the one in use.
  mkdirSync(join(home, '.nvm/alias'), { recursive: true })
  writeFileSync(join(home, '.nvm/alias/default'), 'v22.17.1\n')

  // A file the guard must never let anyone remove.
  writeBlob('Library/Keychains', 0.01)

  return home
}

/** Projects whose environments count as stale (untouched 90+ days). */
export const STALE_PROJECTS = ['Documents/School']

/** Real-world outcome of the session, for ratio checks. */
export const REAL_OUTCOME = {
  freeBeforeGB: 15,
  freeAfterGB: 56.66,
  vscodeExtensionsBeforeGB: 23,
} as const
