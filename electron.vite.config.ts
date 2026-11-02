import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    build: {
      rollupOptions: { input: { index: resolve('src/main/index.ts') } },
    },
  },
  preload: {
    build: {
      // Sandboxed preloads must be CommonJS.
      rollupOptions: {
        input: { index: resolve('src/preload/index.ts') },
        output: { format: 'cjs' },
      },
    },
  },
  renderer: {
    root: resolve('src/renderer'),
    build: {
      rollupOptions: { input: { index: resolve('src/renderer/index.html') } },
    },
    plugins: [react()],
  },
})
