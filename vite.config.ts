/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv, type ProxyOptions } from 'vite'

/** Pasta do projeto: o .env é lido daqui, de onde quer que o Vite seja chamado. */
const RAIZ = fileURLToPath(new URL('.', import.meta.url))

/**
 * Prefixo das chamadas que o servidor de desenvolvimento repassa a cada serviço. Igual ao de
 * src/config.ts: lá o painel monta a URL, aqui o Vite a encaminha.
 */
const PROXY_PREFIX = '/__servico'

const VARIAVEIS: Record<string, string> = {
  notify: 'VITE_NOTIFY_API_URL',
  auth: 'VITE_AUTH_API_URL',
  core: 'VITE_CORE_API_URL',
  ia: 'VITE_IA_API_URL',
  'bi-ia': 'VITE_BI_IA_API_URL',
}

/**
 * No npm run dev o navegador fala só com o Vite, que repassa para os serviços: o CORS dos
 * serviços não barra o painel enquanto a origem local não estiver liberada neles. O user-agent
 * de navegador evita o bloqueio do Cloudflare da Discloud a clientes que não são navegador.
 * O build de produção não usa o proxy: lá cada serviço precisa liberar a origem do painel.
 */
function proxies(env: Record<string, string>): Record<string, ProxyOptions> {
  const resultado: Record<string, ProxyOptions> = {}
  for (const [id, variavel] of Object.entries(VARIAVEIS)) {
    const alvo = (env[variavel] ?? '').trim().replace(/\/+$/, '')
    if (!alvo) {
      continue
    }
    resultado[`${PROXY_PREFIX}/${id}`] = {
      target: alvo,
      changeOrigin: true,
      secure: true,
      rewrite: (caminho) => caminho.slice(`${PROXY_PREFIX}/${id}`.length),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
      },
      configure: (proxy) => {
        // Sem Origin o pedido chega ao serviço como chamada de servidor, sem checagem de CORS.
        proxy.on('proxyReq', (requisicao) => requisicao.removeHeader('origin'))
      },
    }
  }
  return resultado
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, RAIZ, 'VITE_')
  return {
    root: RAIZ,
    envDir: RAIZ,
    plugins: [react()],
    server: { port: 5173, proxy: proxies(env) },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  }
})
