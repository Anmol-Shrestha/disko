// Every IPC channel and its payload lives here. The preload exposes only these
// functions, and the renderer sees only `window.api`.

import type { AuditSnapshot } from './types'

export const IPC = {
  appInfo: 'app:info',
  latestAudit: 'audit:latest',
} as const

export interface AppInfo {
  name: string
  version: string
  platform: string
}

export interface DiskPilotApi {
  appInfo: () => Promise<AppInfo>
  /** The latest audit as JSON. Rejects if no audit has been run yet. */
  latestAudit: () => Promise<AuditSnapshot>
}
