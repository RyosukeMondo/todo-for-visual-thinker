import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

import { boardApiPlugin } from './src/server/plugins/boardApiPlugin'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), boardApiPlugin()],
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
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    host: '0.0.0.0', // Allow external access from network
  },
})
