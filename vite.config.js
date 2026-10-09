import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// Em desenvolvimento, /api e /health são encaminhados para a API Go,
// evitando problemas de CORS no navegador.
// A porta da API vem do .env do backend (PORT); default 8080.
const API_ALVO = process.env.VITE_API_PROXY || 'http://localhost:8082'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: API_ALVO, changeOrigin: true },
      '/health': { target: API_ALVO, changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
  },
})
