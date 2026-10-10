import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
// Em desenvolvimento, /api e /health são encaminhados para a API Go,
// evitando problemas de CORS no navegador.
// A porta da API vem do .env do backend (PORT); default 8080.
const API_ALVO = process.env.VITE_API_PROXY || 'http://localhost:8080'

function origemDaApi(url) {
  try {
    return url ? new URL(url).origin : ''
  } catch {
    return ''
  }
}

export function politicaDeSeguranca(urlApi) {
  const api = origemDaApi(urlApi)
  const fontes = (...extras) => ["'self'", ...extras, api].filter(Boolean).join(' ')

  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    `img-src ${fontes('data:', 'blob:')}`,
    `connect-src ${fontes()}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}

function politicaDeSegurancaNoBuild(urlApi) {
  return {
    name: 'mia-politica-de-seguranca',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: politicaDeSeguranca(urlApi) },
        injectTo: 'head-prepend',
      },
    ],
  }
}

export default defineConfig(({ mode }) => {
  const ambiente = loadEnv(mode, process.cwd(), 'VITE_')

  return {
    plugins: [react(), politicaDeSegurancaNoBuild(ambiente.VITE_API_BASE_URL)],
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
  }
})
