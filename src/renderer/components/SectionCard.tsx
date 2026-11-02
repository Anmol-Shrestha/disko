import type { JSX } from 'react'
import { formatBytes } from '../../shared/format'
import { SECTION_TITLES, type AuditItem, type SectionId } from '../../shared/types'
import { ItemRow } from './ItemRow'

interface SectionCardProps {
  id: SectionId
  items: AuditItem[]
  wide?: boolean
}

/** One audit section as a list, biggest first, in the audit's own order. */
export function SectionCard({ id, items, wide = false }: SectionCardProps): JSX.Element {
  const total = items.reduce((sum, i) => sum + i.bytes, 0)
  return (
    <section className={wide ? 'panel panel--wide' : 'panel'} aria-label={SECTION_TITLES[id]}>
      <header className="panel__header panel__header--split">
        <span>{SECTION_TITLES[id]}</span>
        <span className="panel__meta">
          {items.length} · {formatBytes(total)} listed
        </span>
      </header>
      <ul className="rows">
        {items.map((item) => (
          <ItemRow key={item.path} item={item} />
        ))}
      </ul>
    </section>
  )
}
