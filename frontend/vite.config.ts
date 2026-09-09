import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

type ProxyServer = {
  on(event: 'error', cb: (err: Error, req: IncomingMessage, res: ServerResponse) => void): void
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget = env.BACKEND_URL || env.VITE_BACKEND_URL || 'http://localhost:8000'

  // Jika backend mati, proxy default hanya menulis log ECONNREFUSED dan
  // request menggantung — balas 503 JSON agar UI bisa tampilkan pesan ramah.
  const handleProxyError = (proxy: ProxyServer) => {
    proxy.on('error', (err, _req, res) => {
      if ('writeHead' in res && !res.headersSent) {
        res.writeHead(503, { 'Content-Type': 'application/json' })
      }
      if ('end' in res && !res.writableEnded) {
        res.end(
          JSON.stringify({
            message: `Backend tidak terjangkau (${backendTarget}). Jalankan 'php artisan serve' pada backend lalu coba lagi. Detail: ${err.message}`,
          }),
        )
      }
    })
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          configure: handleProxyError,
        },
        '/storage': {
          target: backendTarget,
          changeOrigin: true,
          configure: handleProxyError,
        },
      },
    },
  }
})
