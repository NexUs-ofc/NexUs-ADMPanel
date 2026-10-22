/**
 * Os cinco serviços que o painel acompanha. Todos respondem às rotas /admin com a mesma chave
 * (header X-Admin-Key), então o painel faz login uma vez só.
 *
 * - "spring": Auth, Core e Notify. Métricas do Micrometer em GET /admin/metrics?minutos=N.
 * - "ia": IA do mobile e BI IA. Métricas do grafo em GET /admin/metrics?dias=N, mais relatório
 *   (/admin/report) e LangSmith (/admin/langsmith).
 */

export type ServiceKind = 'spring' | 'ia'

export type ServiceId = 'notify' | 'auth' | 'core' | 'ia' | 'bi-ia'

export interface ServiceConfig {
  id: ServiceId
  kind: ServiceKind
  /** Nome no menu e no título da página. */
  label: string
  /** Valor da label application, mostrado no chip de filtro como no Prometheus. */
  application: string
  /** Endereço base do serviço, sem barra no fim. Vazio quando não configurado. */
  baseUrl: string
  /** Provedor do modelo, para os textos de cota (só IA). */
  provider?: string
}

function url(value: string | undefined): string {
  return (value ?? '').trim().replace(/\/+$/, '')
}

export const DEMO_MODE = String(import.meta.env.VITE_DEMO_MODE).toLowerCase() === 'true'

/** Ordem do menu, igual ao desenho. */
export const SERVICES: ServiceConfig[] = [
  {
    id: 'notify',
    kind: 'spring',
    label: 'API Notify',
    application: 'notify',
    baseUrl: url(import.meta.env.VITE_NOTIFY_API_URL),
  },
  {
    id: 'auth',
    kind: 'spring',
    label: 'API Auth',
    application: 'auth',
    baseUrl: url(import.meta.env.VITE_AUTH_API_URL),
  },
  {
    id: 'core',
    kind: 'spring',
    label: 'API Core',
    application: 'core',
    baseUrl: url(import.meta.env.VITE_CORE_API_URL),
  },
  {
    id: 'ia',
    kind: 'ia',
    label: 'API Ceris IA',
    application: 'ia',
    baseUrl: url(import.meta.env.VITE_IA_API_URL),
    provider: 'Groq',
  },
  {
    id: 'bi-ia',
    kind: 'ia',
    label: 'API Ceris BI IA',
    application: 'bi-ia',
    baseUrl: url(import.meta.env.VITE_BI_IA_API_URL),
    provider: 'Gemini',
  },
]

export function getService(id: string | undefined): ServiceConfig | undefined {
  return SERVICES.find((service) => service.id === id)
}

export function isConfigured(service: ServiceConfig): boolean {
  return DEMO_MODE || service.baseUrl !== ''
}

/** Intervalo de atualização automática das páginas dos serviços Spring. */
export const SPRING_REFRESH_MS = 60_000

export const SPRING_WINDOWS = [
  { minutos: 15, label: 'Últimos 15 min' },
  { minutos: 60, label: 'Última hora' },
  { minutos: 360, label: 'Últimas 6 horas' },
  { minutos: 720, label: 'Últimas 12 horas' },
] as const

export const IA_WINDOWS = [
  { dias: 1, label: 'Últimas 24 horas' },
  { dias: 7, label: 'Últimos 7 dias' },
  { dias: 14, label: 'Últimos 14 dias' },
  { dias: 30, label: 'Últimos 30 dias' },
] as const
