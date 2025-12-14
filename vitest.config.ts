import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'build/',
        '**/*.config.{js,ts}',
        '**/*.d.ts',
        '**/types/**',
        'src/cli/**',
        'src/web/**',
        'src/web/main.tsx',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@cli': path.resolve(__dirname, './src/cli'),
      '@web': path.resolve(__dirname, './src/web'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@server': path.resolve(__dirname, './src/server'),
    },
  },
})
