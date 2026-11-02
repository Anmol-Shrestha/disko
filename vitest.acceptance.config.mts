import { defineConfig } from 'vitest/config'

// `npm run test:acceptance`: replays the first manual cleanup against a fake home.
// Never point it at the real home folder. Red until Phases 1 and 3 are done.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/acceptance/**/*.test.ts'],
  },
})
