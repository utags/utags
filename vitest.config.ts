import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Enable test coverage
    coverage: {
      provider: 'v8',
      enabled: false,
      include: ['packages/**/src/**/*'],
      exclude: [
        'packages/**/src/**/*.test.ts',
        'packages/**/src/**/__tests__/**/*',
      ],
    },
    // Only run tests in src directory
    include: [
      'packages/**/src/**/*.test.ts',
      'packages/**/src/**/__tests__/**/*',
    ],
    // Setup test environment
    environment: 'jsdom',
  },
})
