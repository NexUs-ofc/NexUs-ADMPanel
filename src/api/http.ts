/**
 * Chamadas aos serviços com a chave do painel. Separa os três jeitos de falhar que a tela explica
 * diferente: chave recusada pelo serviço, servidor sem chave configurada e rede ou CORS.
 */

export const ADMIN_KEY_HEADER = 'X-Admin-Key'

export class UnauthorizedError extends Error {
  constructor() {
    super(
      'O serviço recusou a chave (401). Confira se a ADMIN_API_KEY do servidor é a mesma do painel e se a versão com as rotas /admin já está publicada.',
    )
    this.name = 'UnauthorizedError'
  }
}

export class HttpError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

export class NetworkError extends Error {
  constructor(baseUrl: string) {
    super(
      `Não foi possível falar com ${baseUrl}. O serviço pode estar fora do ar ou barrando a origem do painel (CORS_ALLOWED_ORIGINS).`,
    )
    this.name = 'NetworkError'
  }
}

function mensagemDoCorpo(corpo: unknown): string | null {
  if (corpo && typeof corpo === 'object') {
    const valor = corpo as Record<string, unknown>
    for (const chave of ['error', 'detail', 'detalhe', 'message']) {
      if (typeof valor[chave] === 'string') {
        return valor[chave] as string
      }
    }
  }
  return null
}

export async function getJson<T>(
  baseUrl: string,
  path: string,
  key: string,
  params: Record<string, string | number> = {},
  signal?: AbortSignal,
): Promise<T> {
  const url = new URL(`${baseUrl}${path}`)
  for (const [nome, valor] of Object.entries(params)) {
    url.searchParams.set(nome, String(valor))
  }

  let resposta: Response
  try {
    resposta = await fetch(url, {
      headers: { [ADMIN_KEY_HEADER]: key, Accept: 'application/json' },
      signal,
    })
  } catch (erro) {
    if (erro instanceof DOMException && erro.name === 'AbortError') {
      throw erro
    }
    throw new NetworkError(baseUrl)
  }

  if (resposta.status === 401) {
    throw new UnauthorizedError()
  }

  const corpo: unknown = await resposta.json().catch(() => null)

  if (!resposta.ok) {
    const padrao =
      resposta.status === 503
        ? 'O serviço está sem a chave do painel configurada (ADMIN_API_KEY).'
        : `O serviço respondeu ${resposta.status}.`
    throw new HttpError(resposta.status, mensagemDoCorpo(corpo) ?? padrao)
  }

  return corpo as T
}
