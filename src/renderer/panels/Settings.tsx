import type { JSX } from 'react'

/** Phase 0 placeholder. Settings (thresholds, tracked folders, API key) arrive in later phases. */
export function Settings(): JSX.Element {
  return (
    <section className="panel" aria-label="Settings">
      <header className="panel__header">Settings</header>
      <div className="panel__body panel__body--empty">Nothing to configure yet.</div>
    </section>
  )
}
