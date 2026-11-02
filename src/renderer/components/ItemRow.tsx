import type { JSX } from 'react'
import { formatBytes } from '../../shared/format'
import type { AuditItem, Tier } from '../../shared/types'

const TIER_LABEL: Record<Tier, string> = {
  1: 'Tier 1 · safe',
  2: 'Tier 2 · review',
  3: 'Tier 3 · keep',
  unknown: 'Unknown',
}

/** One folder: what, where, how much, and whether it is safe to delete. */
export function ItemRow({ item }: { item: AuditItem }): JSX.Element {
  const unknown = item.safety.tier === 'unknown'
  return (
    <li className="row">
      <div className="row__what">
        <span className="row__name">{item.what}</span>
        <span className="row__category">{item.category}</span>
      </div>
      <div className="row__path" title={item.path}>
        {item.path}
      </div>
      <div className="row__size">{formatBytes(item.bytes)}</div>
      <div className="row__safety">
        <span className={`chip chip--${String(item.safety.tier)}`}>{TIER_LABEL[item.safety.tier]}</span>
        <span className="row__reason">{item.safety.reason}</span>
        {unknown && (
          // Drill down arrives in Phase 1 with the scanner.
          <button type="button" className="row__drill" disabled title="Drill down arrives with the scanner (Phase 1)">
            Drill down
          </button>
        )}
      </div>
    </li>
  )
}
