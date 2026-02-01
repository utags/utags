import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Enable test coverage
    coverage: {
      provider: 'v8',
      enabled: false,
      include: ['src/**/*'],
      exclude: ['src/**/*.test.ts', 'src/**/__tests__/**/*'],
    },
    // Only run tests in src directory
    include: ['src/**/*.test.ts', 'src/**/__tests__/**/*'],
    // Setup test environment
    environment: 'jsdom',
  },
  plugins: [
    {
      name: 'plasmo-data-text-loader',
      resolveId(id) {
        if (id.startsWith('data-text:')) {
          return id
        }
      },
      load(id) {
        if (id.startsWith('data-text:')) {
          return `export default ''`
        }
      },
    },
  ],
})
