import { app, ipcMain } from 'electron'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { IPC, type AppInfo } from '../shared/ipc'
import type { AuditSnapshot } from '../shared/types'
import { parseAuditText } from './scanner/auditText'

// Mock until the scanner runs: the audit.txt at the project root, as produced by
// scripts/mac_space_audit.sh. Later the scanner writes the JSON itself, into userData.
const mockAuditPath = (): string => join(app.getAppPath(), 'audit.txt')

/** Registers every ipcMain handler. Add new channels to src/shared/ipc.ts first. */
export function registerIpc(): void {
  ipcMain.handle(IPC.appInfo, (): AppInfo => ({
    name: app.getName(),
    version: app.getVersion(),
    platform: process.platform,
  }))

  ipcMain.handle(IPC.latestAudit, async (): Promise<AuditSnapshot> => {
    const text = await readFile(mockAuditPath(), 'utf8')
    return parseAuditText(text, homedir())
  })
}
