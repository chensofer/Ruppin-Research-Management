import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BASE = process.env.NODE_ENV === 'production' ? '/bgroup11/test1/' : '/';

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
