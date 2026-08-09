import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BASE = '/';

export default defineConfig({
  base: BASE,
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5269',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:5269',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
