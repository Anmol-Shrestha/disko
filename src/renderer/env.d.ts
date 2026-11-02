import type { DiskPilotApi } from '../shared/ipc'

declare global {
  interface Window {
    api: DiskPilotApi
  }
}

export {}
