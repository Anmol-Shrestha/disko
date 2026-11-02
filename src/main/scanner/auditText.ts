import type { AuditItem, AuditSnapshot, DiskInfo, LocalSnapshot, SectionId } from '../../shared/types'
import { classify } from './rules'

// Reads audit.txt (the output of scripts/mac_space_audit.sh) into an AuditSnapshot.
// This is a bridge for the mock audit. Once the scanner writes JSON directly, the
// app will not parse text at all, and audit.txt will be rendered from the JSON.

const SECTION_HEADINGS: [SectionId, RegExp][] = [
  ['knownSpaceHogs', /^Known space hogs/],
  ['libraryTop', /^Top 15 folders in ~\/Library$/],
  ['applicationSupportTop', /^Top 15 in ~\/Library\/Application Support$/],
  ['cachesTop', /^Top 15 in ~\/Library\/Caches$/],
  ['dotFolders', /^Hidden dot-folders in home$/],
  ['nodeModules', /^node_modules folders/],
  ['pythonVenvs', /^Python venvs/],
]

type Block = SectionId | 'disk' | 'snapshots'

const UNIT_POWER: Record<string, number> = { '': 0, B: 0, K: 1, M: 2, G: 3, T: 4, P: 5 }

/**
 * Parses a `du -h` / `df -h` size like "7.9G", "24K", "0B", "228Gi".
 * Both use 1024-based units, so this does too.
 */
export function parseHumanSize(text: string): number {
  const match = /^(\d+(?:\.\d+)?)([BKMGTP]?)i?$/.exec(text)
  if (!match) throw new Error(`Not a size: "${text}"`)
  const [, value, unit] = match
  return Math.round(Number(value) * 1024 ** UNIT_POWER[unit])
}

function blockFor(title: string): Block {
  if (title === 'Disk overview') return 'disk'
  if (title.startsWith('Time Machine local snapshots')) return 'snapshots'
  const found = SECTION_HEADINGS.find(([, re]) => re.test(title))
  if (!found) throw new Error(`Unknown audit section: "${title}"`)
  return found[0]
}

/** Finds the home folder from the paths: the first "/Users/<name>" (or "/home/<name>"). */
function homeFrom(text: string): string {
  const match = /(\/Users\/[^/\s]+|\/home\/[^/\s]+)\//.exec(text)
  if (!match) throw new Error('Could not find a home folder in the audit')
  return match[1]
}

function parseDisk(line: string): DiskInfo {
  // Filesystem  Size  Used  Avail  Capacity  iused  ifree  %iused  Mounted on
  const fields = line.trim().split(/\s+/)
  if (fields.length < 9) throw new Error(`Unexpected df line: "${line}"`)
  return {
    device: fields[0],
    mount: fields.slice(8).join(' '),
    totalBytes: parseHumanSize(fields[1]),
    usedBytes: parseHumanSize(fields[2]),
    freeBytes: parseHumanSize(fields[3]),
    capacityPercent: Number(fields[4].replace('%', '')),
  }
}

/** Parses the full text of audit.txt. `home` defaults to the folder found in the paths. */
export function parseAuditText(text: string, home?: string): AuditSnapshot {
  const lines = text.split(/\r?\n/)
  const resolvedHome = home ?? homeFrom(text)

  let disk: DiskInfo | null = null
  const localSnapshots: LocalSnapshot[] = []
  const items: AuditItem[] = []
  let block: Block | null = null

  for (const raw of lines) {
    const heading = /^=== (.+) ===$/.exec(raw.trim())
    if (heading) {
      block = blockFor(heading[1])
      continue
    }
    const line = raw.trimEnd()
    if (line.trim() === '' || block === null) continue

    if (block === 'disk') {
      if (line.startsWith('/dev/')) disk = parseDisk(line)
      continue
    }

    if (block === 'snapshots') {
      const name = line.trim()
      if (name.startsWith('com.apple.')) {
        localSnapshots.push({ name, pendingMacOSUpdate: name.includes('MSUPrepareUpdate') })
      }
      continue
    }

    // du output: "   7.9G  /path" (spaces or a tab between size and path)
    const row = /^\s*(\d+(?:\.\d+)?[BKMGTP]?)\s+(\/\S.*)$/.exec(line)
    if (!row) continue
    const path = row[2].trim()
    const { what, category, safety } = classify(path, resolvedHome)
    items.push({ section: block, what, category, path, bytes: parseHumanSize(row[1]), safety })
  }

  if (disk === null) throw new Error('audit has no "Disk overview" line')
  return { home: resolvedHome, disk, localSnapshots, items }
}
