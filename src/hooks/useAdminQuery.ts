import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from '../auth/session'

export interface QueryState<T> {
  data: T | null
  error: Error | null
  loading: boolean
  /** Instante da última resposta boa, para o "atualizado às". */
  updatedAt: Date | null
  reload: () => void
}

/**
 * Busca dados de uma rota /admin com a chave da sessão.
 *
 * - Chave recusada (401) por um serviço vira erro daquela página, sem derrubar a sessão: um serviço
 *   ainda sem as rotas /admin, ou com outra chave, não pode impedir o uso dos outros.
 * - Ao trocar os parâmetros, a requisição anterior é cancelada: resposta velha não sobrescreve a nova.
 * - Com refreshMs, recarrega sozinha mantendo o dado anterior na tela enquanto busca.
 * - enabled=false deixa a busca parada até ser pedida (relatório, LangSmith).
 */
export function useAdminQuery<T>(
  fetcher: (key: string, signal: AbortSignal) => Promise<T>,
  deps: unknown[],
  options: { refreshMs?: number; enabled?: boolean } = {},
): QueryState<T> {
  const { adminKey } = useSession()
  const { refreshMs, enabled = true } = options
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  // Carregando = a última resposta (boa ou com erro) não é a dos parâmetros atuais. Derivado, e não
  // um setState no começo do efeito, que forçaria uma renderização a mais a cada busca.
  const [respondida, setRespondida] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [tick, setTick] = useState(0)
  const fetcherRef = useRef(fetcher)

  useEffect(() => {
    fetcherRef.current = fetcher
  })

  const reload = useCallback(() => setTick((n) => n + 1), [])
  const consultaAtual = JSON.stringify([adminKey, tick, ...deps])

  useEffect(() => {
    if (!enabled || !adminKey) {
      return
    }
    const controle = new AbortController()
    const consulta = consultaAtual
    fetcherRef
      .current(adminKey, controle.signal)
      .then((resultado) => {
        setData(resultado)
        setError(null)
        setUpdatedAt(new Date())
      })
      .catch((erro: unknown) => {
        if (controle.signal.aborted) {
          return
        }
        setError(erro instanceof Error ? erro : new Error(String(erro)))
      })
      .finally(() => {
        if (!controle.signal.aborted) {
          setRespondida(consulta)
        }
      })
    return () => controle.abort()
  }, [adminKey, enabled, consultaAtual])

  useEffect(() => {
    if (!refreshMs || !enabled) {
      return
    }
    const intervalo = setInterval(reload, refreshMs)
    return () => clearInterval(intervalo)
  }, [refreshMs, enabled, reload])

  const loading = enabled && respondida !== consultaAtual

  return { data, error, loading, updatedAt, reload }
}
