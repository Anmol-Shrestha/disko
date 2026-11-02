import type { BrowserWindowConstructorOptions } from 'electron'

/** Window settings for the main window. Kept free of side effects so tests can read them. */
export function mainWindowOptions(preload: string): BrowserWindowConstructorOptions {
  return {
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#0F1114',
    // Traffic lights sit inside our own title bar.
    titleBarStyle: 'hiddenInset',
    show: false,
    webPreferences: {
      preload,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  }
}
