import type { AuditSnapshot, SectionId, Tier } from './types'

export interface TierCounts {
  safe: number
  review: number
  keep: number
  unknown: number
}

export interface DashboardSummary {
  freeBytes: number
  totalBytes: number
  capacityPercent: number
  /** Rows per tier in Known space hogs. Counts rows, not bytes, because folders overlap. */
  tierCounts: TierCounts
  /** Safe-to-clear rows in Known space hogs. */
  safeCount: number
  safeBytes: number
  pendingMacOSUpdate: boolean
}

/** Numbers for the three dashboard cards, computed only from the audit. */
export function summarize(snapshot: AuditSnapshot, section: SectionId = 'knownSpaceHogs'): DashboardSummary {
  const rows = snapshot.items.filter((i) => i.section === section)

  const count = (tier: Tier): number => rows.filter((i) => i.safety.tier === tier).length
  const safeRows = rows.filter((i) => i.safety.tier === 1)

  return {
    freeBytes: snapshot.disk.freeBytes,
    totalBytes: snapshot.disk.totalBytes,
    capacityPercent: snapshot.disk.capacityPercent,
    tierCounts: {
      safe: count(1),
      review: count(2),
      keep: count(3),
      unknown: count('unknown'),
    },
    safeCount: safeRows.length,
    // Safe rows in one section only: rows in other sections repeat the same folders.
    safeBytes: safeRows.reduce((sum, i) => sum + i.bytes, 0),
    pendingMacOSUpdate: snapshot.localSnapshots.some((s) => s.pendingMacOSUpdate),
  }
}
