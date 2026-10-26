import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { checkKey, type LoginResult } from '../api/services'

/**
 * A chave do painel fica no sessionStorage: some quando a aba fecha e não vaza para outras abas.
 * Não vai para o localStorage de propósito, porque ela abre os dados de todos os serviços.
 */
const STORAGE_KEY = 'nexus-admin-key'

interface SessionValue {
  adminKey: string | null
  login: (key: string) => Promise<LoginResult>
  logout: (motivo?: string) => void
  /** Mensagem mostrada no login depois de uma saída forçada (chave recusada). */
  aviso: string | null
}

const SessionContext = createContext<SessionValue | null>(null)

function lerChave(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [adminKey, setAdminKey] = useState<string | null>(lerChave)
  const [aviso, setAviso] = useState<string | null>(null)

  const login = useCallback(async (key: string) => {
    const resultado = await checkKey(key.trim())
    if (resultado.ok) {
      try {
        sessionStorage.setItem(STORAGE_KEY, key.trim())
      } catch {
        // Sem storage (aba privada restrita): a sessão vale só enquanto a página estiver aberta.
      }
      setAviso(null)
      setAdminKey(key.trim())
    }
    return resultado
  }, [])

  const logout = useCallback((motivo?: string) => {
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // Nada a limpar.
    }
    setAviso(motivo ?? null)
    setAdminKey(null)
  }, [])

  const valor = useMemo(() => ({ adminKey, login, logout, aviso }), [adminKey, login, logout, aviso])

  return <SessionContext.Provider value={valor}>{children}</SessionContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession(): SessionValue {
  const valor = useContext(SessionContext)
  if (!valor) {
    throw new Error('useSession precisa estar dentro de SessionProvider')
  }
  return valor
}
