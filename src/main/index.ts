import { app, BrowserWindow, shell } from 'electron'
import { join } from 'node:path'
import { registerIpc } from './ipc'
import { mainWindowOptions } from './windowOptions'

function createWindow(): void {
  const win = new BrowserWindow(mainWindowOptions(join(__dirname, '../preload/index.js')))

  win.on('ready-to-show', () => {
    win.show()
  })

  // The renderer never opens new windows or navigates away from the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event) => {
    event.preventDefault()
  })

  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) void win.loadURL(devUrl)
  else void win.loadFile(join(__dirname, '../renderer/index.html'))
}

void app.whenReady().then(() => {
  registerIpc()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
