import { useEffect, useState } from 'react'
import type { AuditSnapshot } from '../../shared/types'

export type AuditState =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; snapshot: AuditSnapshot }

/** Loads the latest audit once, through the typed preload bridge. */
export function useLatestAudit(): AuditState {
  const [state, setState] = useState<AuditState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    window.api
      .latestAudit()
      .then((snapshot) => {
        if (!cancelled) setState({ status: 'ready', snapshot })
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: 'error', message: error instanceof Error ? error.message : String(error) })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
