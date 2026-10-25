import { solidStart } from '@solidjs/start/config'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

// Native addons (onnxruntime, tokenizers) cannot be bundled; keep them as runtime imports.
const nativeDeps = ['fastembed', 'onnxruntime-node', '@anush008/tokenizers']

export default defineConfig({
  ssr: { external: nativeDeps },
  environments: { nitro: { resolve: { external: nativeDeps } } },
  server: { host: process.env.HOST ?? '127.0.0.1', port: Number(process.env.PORT ?? 3000) },
  plugins: [solidStart(), tailwindcss(), nitro({ preset: 'bun' })],
})
