import { defineConfig } from 'vitest/config'

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
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
    globals: true,
  },
  plugins: [
    {
      name: 'plasmo-data-text-loader',
      resolveId(id: string) {
        if (id.startsWith('data-text:')) {
          return id
        }
      },
      load(id: string) {
        if (id.startsWith('data-text:')) {
          return `export default ''`
        }
      },
    },
  ],
})
