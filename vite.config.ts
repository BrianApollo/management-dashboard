import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8788',
      '/paperclip': {
        target: 'https://bannister-bullseye-pastel.ngrok-free.dev/',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/paperclip/, '/api'),
      },
    },
  },
})
