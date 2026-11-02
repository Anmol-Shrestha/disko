import type { JSX } from 'react'

/** Phase 0 placeholder. The shared terminal (xterm.js + node-pty) arrives in Phase 2. */
export function Terminal(): JSX.Element {
  return (
    <section className="panel" aria-label="Terminal">
      <header className="panel__header">Terminal</header>
      <div className="panel__body panel__body--empty">A shared shell for you and Claude. Coming in Phase 2.</div>
    </section>
  )
}
