import { defineConfig } from 'vitest/config'

// Default `npm test`: unit tests only. The acceptance test has its own config
// (vitest.acceptance.config.ts) and stays out of this run until Phase 3.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/acceptance/**', 'node_modules/**'],
  },
})
