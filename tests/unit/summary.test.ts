import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseAuditText } from '../../src/main/scanner/auditText'
import { summarize } from '../../src/shared/summary'

const text = readFileSync(join(__dirname, '../fixtures/mock-audit.txt'), 'utf8')
const snapshot = parseAuditText(text, '/Users/anmolsagarshrestha')
const summary = summarize(snapshot)

describe('dashboard summary', () => {
  it('takes free and total space from the disk overview', () => {
    expect(summary.freeBytes).toBe(15 * 1024 ** 3)
    expect(summary.totalBytes).toBe(228 * 1024 ** 3)
    expect(summary.capacityPercent).toBe(51)
  })

  it('counts the known space hogs by tier, and every row lands in one tier', () => {
    const { safe, review, keep, unknown } = summary.tierCounts
    expect(safe + review + keep + unknown).toBe(21)
    expect(safe).toBeGreaterThan(0)
    expect(unknown).toBeGreaterThan(0)
  })

  it('sums only safe rows of one section, so overlapping folders are not counted twice', () => {
    const safeRows = snapshot.items.filter((i) => i.section === 'knownSpaceHogs' && i.safety.tier === 1)
    expect(summary.safeCount).toBe(safeRows.length)
    expect(summary.safeBytes).toBe(safeRows.reduce((s, i) => s + i.bytes, 0))
  })

  it('flags the pending macOS update', () => {
    expect(summary.pendingMacOSUpdate).toBe(true)
  })
})
