import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/dashboard': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/orders': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/returns': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/upload': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/files': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/analytics': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/database': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/users': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/roles': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/sync': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/export': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/permissions': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/sellers': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
