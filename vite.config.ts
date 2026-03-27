import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/@tanstack/react-router')) {
            return 'vendor-router'
          }
          if (id.includes('node_modules/@monaco-editor')) {
            return 'vendor-monaco'
          }
          if (id.includes('node_modules/@xterm')) {
            return 'vendor-xterm'
          }
          if (id.includes('node_modules/')) {
            return 'vendor'
          }
        },
      },
    },
  },
})
