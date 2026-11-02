import type { JSX } from 'react'

/** Phase 0 placeholder. The Claude agent arrives in Phase 4. */
export function Chat(): JSX.Element {
  return (
    <section className="panel" aria-label="Claude chat">
      <header className="panel__header">Claude</header>
      <div className="panel__body panel__body--empty">Chat with Claude about your storage. Coming in Phase 4.</div>
    </section>
  )
}
