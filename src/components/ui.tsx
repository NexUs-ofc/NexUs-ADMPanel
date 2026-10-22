import type { ReactNode } from 'react'
import { AlertIcon } from './icons'

export function Section({
  numero,
  titulo,
  descricao,
  children,
}: {
  numero: string
  titulo: string
  descricao?: string
  children: ReactNode
}) {
  return (
    <section className="secao" aria-labelledby={`secao-${numero}`}>
      <div className="secao__cabeca">
        <span className="secao__numero">{numero}</span>
        <h2 className="secao__titulo" id={`secao-${numero}`}>
          {titulo}
        </h2>
      </div>
      {descricao && <p className="secao__descricao">{descricao}</p>}
      <div className="grade">{children}</div>
    </section>
  )
}

export function Card({
  titulo,
  subtitulo,
  formula,
  inteiro = false,
  children,
}: {
  titulo: string
  subtitulo?: ReactNode
  /** Consulta equivalente (PromQL ou origem do dado), em letra pequena no rodapé. */
  formula?: string
  inteiro?: boolean
  children: ReactNode
}) {
  return (
    <article className={`cartao${inteiro ? ' cartao--inteiro' : ''}`}>
      <h3 className="cartao__titulo">{titulo}</h3>
      {subtitulo && <p className="cartao__subtitulo">{subtitulo}</p>}
      <div className="cartao__corpo">{children}</div>
      {formula && <p className="cartao__formula mono">{formula}</p>}
    </article>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="cartao__vazio">{children}</div>
}

export function Kpi({ valor, rotulo, alerta = false }: { valor: string; rotulo: string; alerta?: boolean }) {
  return (
    <div>
      <div className={`kpi__valor${alerta ? ' kpi__valor--alerta' : ''}`}>{valor}</div>
      <div className="kpi__rotulo">{rotulo}</div>
    </div>
  )
}

export function ErrorBanner({ titulo, mensagem, onRetry }: { titulo: string; mensagem: string; onRetry?: () => void }) {
  return (
    <div className="aviso aviso--erro" role="alert">
      <AlertIcon size={18} />
      <div style={{ flex: 1 }}>
        <div className="aviso__titulo">{titulo}</div>
        <div>{mensagem}</div>
      </div>
      {onRetry && (
        <button type="button" className="botao botao--secundario" onClick={onRetry}>
          Tentar de novo
        </button>
      )}
    </div>
  )
}

export function InfoBanner({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="aviso aviso--info">
      <div>
        <div className="aviso__titulo">{titulo}</div>
        <div>{children}</div>
      </div>
    </div>
  )
}

export function Skeleton({ altura = 240 }: { altura?: number }) {
  return <div className="esqueleto" style={{ height: altura }} aria-hidden="true" />
}

export function PageSkeleton() {
  return (
    <div className="grade" aria-busy="true" aria-label="Carregando">
      <div className="cartao--inteiro">
        <Skeleton altura={110} />
      </div>
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} altura={300} />
      ))}
    </div>
  )
}

export interface Column<T> {
  titulo: string
  valor: (linha: T, indice: number) => ReactNode
  numero?: boolean
}

export function DataTable<T>({ colunas, linhas, vazio }: { colunas: Column<T>[]; linhas: T[]; vazio: string }) {
  if (linhas.length === 0) {
    return <Empty>{vazio}</Empty>
  }
  return (
    <div className="tabela-rolagem">
      <table className="tabela">
        <thead>
          <tr>
            {colunas.map((coluna) => (
              <th key={coluna.titulo} className={coluna.numero ? 'num' : undefined}>
                {coluna.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, i) => (
            <tr key={i}>
              {colunas.map((coluna) => (
                <td key={coluna.titulo} className={coluna.numero ? 'num' : undefined}>
                  {coluna.valor(linha, i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
