import { describe, expect, it } from 'vitest'
import { mainWindowOptions } from '../../src/main/windowOptions'

describe('main window options', () => {
  const opts = mainWindowOptions('/app/out/preload/index.js')

  it('uses secure web preferences', () => {
    expect(opts.webPreferences).toMatchObject({
      preload: '/app/out/preload/index.js',
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    })
  })

  it('opens at 1440×900 with a 1100×720 minimum', () => {
    expect([opts.width, opts.height]).toEqual([1440, 900])
    expect([opts.minWidth, opts.minHeight]).toEqual([1100, 720])
  })

  it('uses a hidden-inset title bar on the dark ground colour', () => {
    expect(opts.titleBarStyle).toBe('hiddenInset')
    expect(opts.backgroundColor).toBe('#0F1114')
  })
})
