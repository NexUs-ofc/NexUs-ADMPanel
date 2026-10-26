import type { ReactNode } from 'react'
import { RefreshIcon } from './icons'

export function PageHeader({
  titulo,
  subtitulo,
  chips,
  filtro,
  acoes,
  carregando,
  atualizadoEm,
  onRefresh,
}: {
  titulo: string
  subtitulo: string
  chips: string[]
  filtro?: string
  acoes?: ReactNode
  carregando: boolean
  atualizadoEm: Date | null
  onRefresh: () => void
}) {
  return (
    <header>
      <h1 className="pagina__titulo">{titulo}</h1>
      <p className="pagina__subtitulo">{subtitulo}</p>
      <div className="pagina__barra">
        {chips.map((chip) => (
          <span key={chip} className="chip mono">
            {chip}
          </span>
        ))}
        <div className="pagina__acoes">
          {atualizadoEm && (
            <span className="atualizado">
              Atualizado às {atualizadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          {acoes}
          <button
            type="button"
            className="icone-botao"
            onClick={onRefresh}
            disabled={carregando}
            aria-label="Atualizar agora"
            title="Atualizar agora"
          >
            <RefreshIcon size={16} className="gira" />
          </button>
        </div>
      </div>
      {filtro && <p className="pagina__filtro">{filtro}</p>}
    </header>
  )
}
