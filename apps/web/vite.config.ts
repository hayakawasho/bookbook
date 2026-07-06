import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/** ローカルでは `npm run dev:api`（wrangler dev / 既定 8787）と併用し `/api` をプロキシする */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    preserveSymlinks: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
})
