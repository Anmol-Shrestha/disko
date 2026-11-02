import type { JSX } from 'react'
import { formatBytes } from '../../shared/format'
import { SECTION_ORDER, type AuditSnapshot } from '../../shared/types'
import { summarize } from '../../shared/summary'
import { SectionCard } from '../components/SectionCard'
import { useLatestAudit } from '../state/useLatestAudit'

export function Dashboard(): JSX.Element {
  const audit = useLatestAudit()

  if (audit.status === 'loading') {
    return <p className="status">Loading the latest audit…</p>
  }
  if (audit.status === 'error') {
    return (
      <div className="status status--error">
        <p>No audit found. Run scripts/mac_space_audit.sh and save its output as audit.txt.</p>
        <p className="status__detail">{audit.message}</p>
      </div>
    )
  }
  return <Audit snapshot={audit.snapshot} />
}

function Audit({ snapshot }: { snapshot: AuditSnapshot }): JSX.Element {
  const summary = summarize(snapshot)
  const { tierCounts } = summary

  return (
    <>
      {summary.pendingMacOSUpdate && (
        <div className="banner" role="status">
          A macOS update is pending (MSUPrepareUpdate). Install the macOS update to clear it.
        </div>
      )}

      <section className="cards" aria-label="Storage overview">
        <div className="card">
          <h2 className="card__title">Free space</h2>
          <p className="card__value">{formatBytes(summary.freeBytes)}</p>
          <p className="card__hint">
            of {formatBytes(summary.totalBytes)} · {summary.capacityPercent}% used
          </p>
        </div>
        <div className="card">
          <h2 className="card__title">Categories</h2>
          <ul className="tally">
            <li className="chip chip--1">{tierCounts.safe} safe</li>
            <li className="chip chip--2">{tierCounts.review} review</li>
            <li className="chip chip--3">{tierCounts.keep} keep</li>
            <li className="chip chip--unknown">{tierCounts.unknown} unknown</li>
          </ul>
          <p className="card__hint">Known space hogs, by safety</p>
        </div>
        <div className="card">
          <h2 className="card__title">Bloat alerts</h2>
          <p className="card__value">{formatBytes(summary.safeBytes)}</p>
          <p className="card__hint">
            safe to clear in {summary.safeCount} {summary.safeCount === 1 ? 'folder' : 'folders'}
          </p>
        </div>
      </section>

      <div className="sections">
        {SECTION_ORDER.map((id) => {
          const items = snapshot.items.filter((i) => i.section === id)
          return <SectionCard key={id} id={id} items={items} wide={id === 'knownSpaceHogs'} />
        })}
      </div>
    </>
  )
}
