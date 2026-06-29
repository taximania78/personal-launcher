import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    // Integration tests share a single postgres DB; run files serially to
    // prevent truncateAll() in one file from racing with inserts in another.
    fileParallelism: false,
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
})
