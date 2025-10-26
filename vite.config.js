import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Anything starting with /api will be forwarded to the Vercel API dev server
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // Leave pathRewrite off because your API already lives at /api/*
      },
    },
  },
})
