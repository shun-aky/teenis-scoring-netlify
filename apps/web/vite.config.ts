import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@tennis/core': path.resolve(__dirname, '../../packages/core/src'),
    },
  },
  server: { port: 5173 }
})
