import { matchesKeyHash } from '../auth/keyHash'
import { ADMIN_KEY_SHA256, DEMO_MODE, enderecoDeChamada, SERVICES, type ServiceConfig } from '../config'
import { demoIaDashboard, demoIaReport, demoLangsmith, demoSpringDashboard } from './demo'
import { getJson, HttpError, NetworkError, UnauthorizedError } from './http'
import { normalizeLangsmith } from './normalize'
import type { AdminSession, IaDashboard, IaReport, LangsmithRaw, LangsmithSection, SpringDashboard } from './types'

function base(service: ServiceConfig): string {
  return enderecoDeChamada(service.id, service.baseUrl)
}

function atraso<T>(valor: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(valor), ms))
}

export function fetchSpringDashboard(
  service: ServiceConfig,
  key: string,
  minutos: number,
  signal?: AbortSignal,
): Promise<SpringDashboard> {
  if (DEMO_MODE) {
    return atraso(demoSpringDashboard(service, minutos))
  }
  return getJson<SpringDashboard>(base(service), '/admin/metrics', key, { minutos }, signal)
}

export function fetchIaDashboard(
  service: ServiceConfig,
  key: string,
  dias: number,
  signal?: AbortSignal,
): Promise<IaDashboard> {
  if (DEMO_MODE) {
    return atraso(demoIaDashboard(service, dias))
  }
  return getJson<IaDashboard>(base(service), '/admin/metrics', key, { dias }, signal)
}

export function fetchIaReport(service: ServiceConfig, key: string, dias: number, signal?: AbortSignal): Promise<IaReport> {
  if (DEMO_MODE) {
    return atraso(demoIaReport(service, dias), 700)
  }
  return getJson<IaReport>(base(service), '/admin/report', key, { dias }, signal)
}

export async function fetchLangsmith(
  service: ServiceConfig,
  key: string,
  dias: number,
  signal?: AbortSignal,
): Promise<LangsmithSection> {
  const raw = DEMO_MODE
    ? await atraso(demoLangsmith(service, dias), 1200)
    : await getJson<LangsmithRaw>(base(service), '/admin/langsmith', key, { dias }, signal)
  return normalizeLangsmith(raw)
}

export type LoginResult =
  | { ok: true; servico: string }
  | { ok: false; motivo: 'chave' | 'servidor' | 'rede' | 'sem-servico'; mensagem: string }

/**
 * Confere a chave no login. A chave é a mesma em todos os serviços, então basta um aceitar.
 * Pergunta a todos ao mesmo tempo porque algum pode estar fora do ar.
 */
export async function checkKey(key: string): Promise<LoginResult> {
  if (DEMO_MODE) {
    return atraso({ ok: true, servico: 'demonstração' })
  }

  // Com o hash configurado, o próprio painel confere a chave: o login funciona mesmo com os
  // serviços fora do ar ou ainda sem as rotas /admin. Os dados continuam vindo de cada serviço.
  if (ADMIN_KEY_SHA256) {
    return (await matchesKeyHash(key, ADMIN_KEY_SHA256))
      ? { ok: true, servico: 'painel' }
      : { ok: false, motivo: 'chave', mensagem: 'Chave de acesso inválida.' }
  }

  const configurados = SERVICES.filter((service) => service.baseUrl !== '')
  if (configurados.length === 0) {
    return {
      ok: false,
      motivo: 'sem-servico',
      mensagem: 'Nenhum serviço configurado. Preencha os endereços no .env.local.',
    }
  }

  const tentativas = await Promise.allSettled(
    configurados.map((service) => getJson<AdminSession>(base(service), '/admin/session', key)),
  )

  const aceita = tentativas.find((tentativa) => tentativa.status === 'fulfilled')
  if (aceita?.status === 'fulfilled') {
    return { ok: true, servico: aceita.value.servico }
  }

  const erros = tentativas.map((tentativa) => (tentativa as PromiseRejectedResult).reason)
  if (erros.some((erro) => erro instanceof UnauthorizedError)) {
    return { ok: false, motivo: 'chave', mensagem: 'Chave de acesso inválida.' }
  }
  if (erros.some((erro) => erro instanceof HttpError && erro.status === 503)) {
    return {
      ok: false,
      motivo: 'servidor',
      mensagem: 'Os serviços estão sem a chave do painel configurada (ADMIN_API_KEY).',
    }
  }
  if (erros.every((erro) => erro instanceof NetworkError)) {
    return { ok: false, motivo: 'rede', mensagem: 'Nenhum serviço respondeu. Confira a conexão e os endereços.' }
  }
  return { ok: false, motivo: 'servidor', mensagem: 'Não foi possível confirmar a chave agora.' }
}
