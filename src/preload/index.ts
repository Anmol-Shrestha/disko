import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type DiskPilotApi } from '../shared/ipc'

// The only bridge to the renderer. Each function maps to one typed channel.
const api: DiskPilotApi = {
  appInfo: () => ipcRenderer.invoke(IPC.appInfo),
  latestAudit: () => ipcRenderer.invoke(IPC.latestAudit),
}

contextBridge.exposeInMainWorld('api', api)
