import { basename } from 'node:path'
import type { Recommended, Safety, Tier } from '../../shared/types'

// Seeded from the CLAUDE.md category table. Patterns are either home-relative
// ("~/Library/Caches/Mozilla") or absolute ("/private/var/vm"). A `*` matches
// one path segment. The first matching rule wins, so list specific paths first.

interface Rule {
  pattern: string
  what: string
  category: string
  tier: Tier
  reason: string
}

const RULES: Rule[] = [
  // Tier 1: safe caches
  {
    pattern: '~/Library/Caches/*.ShipIt',
    what: 'App update leftovers',
    category: 'App update leftovers',
    tier: 1,
    reason: 'Old update download; the app fetches a new one when needed',
  },
  {
    pattern: '~/Library/Caches/Mozilla',
    what: 'Mozilla browser cache',
    category: 'Browser caches',
    tier: 1,
    reason: 'Browser cache; rebuilds on next visit',
  },
  {
    pattern: '~/Library/Caches/Firefox',
    what: 'Firefox browser cache',
    category: 'Browser caches',
    tier: 1,
    reason: 'Browser cache; rebuilds on next visit',
  },
  {
    pattern: '~/Library/Caches/Google',
    what: 'Google browser cache',
    category: 'Browser caches',
    tier: 1,
    reason: 'Browser cache; rebuilds on next visit',
  },
  {
    pattern: '~/Library/Caches/pnpm',
    what: 'pnpm cache',
    category: 'Package caches',
    tier: 1,
    reason: 'Package cache; rebuilds on install (pnpm store prune)',
  },
  {
    pattern: '~/Library/pnpm',
    what: 'pnpm store',
    category: 'Package caches',
    tier: 1,
    reason: 'Package store; rebuilds on install (pnpm store prune)',
  },
  {
    pattern: '~/Library/Caches/pip',
    what: 'pip cache',
    category: 'Package caches',
    tier: 1,
    reason: 'Package cache; rebuilds on install',
  },
  {
    pattern: '~/Library/Caches/pipenv',
    what: 'pipenv cache',
    category: 'Package caches',
    tier: 1,
    reason: 'Package cache; rebuilds on install',
  },
  {
    pattern: '~/Library/Caches/Homebrew',
    what: 'Homebrew cache',
    category: 'Package caches',
    tier: 1,
    reason: 'Downloaded bottles; brew cleanup -s removes them',
  },
  {
    pattern: '~/.npm',
    what: 'npm cache',
    category: 'Package caches',
    tier: 1,
    reason: 'Package cache; rebuilds on install (npm cache clean --force)',
  },
  {
    pattern: '~/.cache/uv',
    what: 'uv cache',
    category: 'Package caches',
    tier: 1,
    reason: 'Package cache; rebuilds on install (uv cache clean)',
  },
  {
    pattern: '~/.bun/install/cache',
    what: 'bun cache',
    category: 'Package caches',
    tier: 1,
    reason: 'Package cache; rebuilds on install',
  },
  {
    pattern: '~/.cache/selenium',
    what: 'Selenium browser drivers',
    category: 'Test browsers',
    tier: 1,
    reason: 'Test browser download; re-downloads when needed',
  },
  {
    pattern: '~/.cache/puppeteer',
    what: 'Puppeteer test browsers',
    category: 'Test browsers',
    tier: 1,
    reason: 'Test browser download; re-downloads when needed',
  },
  {
    pattern: '~/Library/Developer/Xcode/DerivedData',
    what: 'Xcode DerivedData',
    category: 'Build caches',
    tier: 1,
    reason: 'Build output; Xcode rebuilds it',
  },

  // Tier 2: review per item
  {
    pattern: '~/.m2',
    what: 'Maven repository',
    category: 'Build caches',
    tier: 2,
    reason: 'Downloaded Java libraries; re-downloaded on next build',
  },
  {
    pattern: '~/.cache/huggingface',
    what: 'Hugging Face models',
    category: 'ML models',
    tier: 2,
    reason: 'Downloaded ML models; you decide whether you still need them',
  },

  // Tier 3: report only
  {
    pattern: '~/Library/Application Support/*',
    what: 'App data',
    category: 'App data',
    tier: 3,
    reason: 'App data: clear from inside the app, never delete directly',
  },
  {
    pattern: '~/Library/Group Containers/*',
    what: 'App group data',
    category: 'App data',
    tier: 3,
    reason: 'App data: clear from inside the app, never delete directly',
  },
  {
    pattern: '~/Library/Mail',
    what: 'Mail',
    category: 'Messages',
    tier: 3,
    reason: 'Mail data: never touched by DiskPilot',
  },
  {
    pattern: '~/Library/Messages/Attachments',
    what: 'Messages attachments',
    category: 'Messages',
    tier: 3,
    reason: 'Messages data: never touched by DiskPilot',
  },
  {
    pattern: '~/Library/Containers/com.docker.docker',
    what: 'Docker Desktop VM',
    category: 'Containers',
    tier: 3,
    reason: 'Docker VM disk: clean it from Docker Desktop, not from disk',
  },
  {
    pattern: '/private/var/vm',
    what: 'Swap files',
    category: 'macOS',
    tier: 3,
    reason: 'macOS manages swap; report only',
  },
  {
    pattern: '/private/var/folders',
    what: 'macOS temporary folders',
    category: 'macOS',
    tier: 3,
    reason: 'macOS manages these; report only',
  },
  {
    pattern: '/Library/Updates',
    what: 'macOS update downloads',
    category: 'macOS',
    tier: 3,
    reason: 'Update files; install the pending macOS update to clear them',
  },
  {
    pattern: '/Library/Caches',
    what: 'System caches',
    category: 'macOS',
    tier: 3,
    reason: 'System caches; report only',
  },
]

const UNKNOWN_REASON = 'Not explained yet. Drill down to find the cause.'

export interface Classification {
  what: string
  category: string
  safety: Safety
}

/** Turns a pattern into a regex. `~/` matches the home folder given to classify(). */
function patternToRegex(pattern: string): RegExp {
  const escaped = pattern
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('[^/]*')
  return new RegExp(`^${escaped}$`)
}

const COMPILED = RULES.map((rule) => ({ rule, regex: patternToRegex(rule.pattern) }))

function recommendedFor(tier: Tier): Recommended {
  if (tier === 1) return 'remove'
  if (tier === 3) return 'keep'
  return 'review'
}

/** Works out what a folder is and how safe it is to delete. */
export function classify(path: string, home: string): Classification {
  const shown = path.startsWith(`${home}/`) ? `~/${path.slice(home.length + 1)}` : path
  const hit = COMPILED.find(({ regex }) => regex.test(shown))
  if (hit) {
    const { rule } = hit
    return {
      what: rule.what,
      category: rule.category,
      safety: { tier: rule.tier, reason: rule.reason, recommended: recommendedFor(rule.tier) },
    }
  }

  const name = basename(path)
  if (name === 'node_modules') {
    return {
      what: 'node_modules',
      category: 'Project environments',
      safety: {
        tier: 2,
        reason: 'Project dependencies: reinstall with npm install, not a cache',
        recommended: 'review',
      },
    }
  }
  if (name === '.venv' || name === 'venv') {
    return {
      what: `Python venv (${name})`,
      category: 'Project environments',
      safety: {
        tier: 2,
        reason: 'Python environment: recreate from requirements; keep if the project is active',
        recommended: 'review',
      },
    }
  }

  return {
    what: name,
    category: 'Unclassified',
    safety: { tier: 'unknown', reason: UNKNOWN_REASON, recommended: 'review' },
  }
}
