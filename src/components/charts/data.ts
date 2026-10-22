import type { Serie } from '../../api/types'

/** Paleta dos gráficos, na ordem em que as séries recebem cor: roxos primeiro, depois contraste. */
export const PALETTE = ['#4b1d78', '#8e5bc8', '#5b8dd6', '#d9922e', '#b9a3e0', '#2e9e6b', '#d1516b', '#7a6f8f']

export const COLOR = {
  roxo: '#4b1d78',
  lilas: '#8e5bc8',
  lilasClaro: '#b9a3e0',
  azul: '#5b8dd6',
  laranja: '#d9922e',
  vermelho: '#d1516b',
  verde: '#2e9e6b',
  cinza: '#9a94ab',
}

export type Row = { t: string } & Record<string, number | string | null>

/**
 * Junta várias séries no formato de linhas que o Recharts desenha: uma linha por instante, uma
 * coluna por série. Instante que só existe numa série entra com null nas outras (vira lacuna).
 */
export function toRows(series: Serie[]): Row[] {
  const porInstante = new Map<string, Row>()
  for (const serie of series) {
    for (const ponto of serie.pontos) {
      const linha = porInstante.get(ponto.t) ?? { t: ponto.t }
      linha[serie.nome] = ponto.v
      porInstante.set(ponto.t, linha)
    }
  }
  return [...porInstante.values()].sort((a, b) => a.t.localeCompare(b.t))
}

/** Maior valor entre todas as séries, para decidir se o gráfico tem algo a mostrar. */
export function hasData(series: Serie[]): boolean {
  return series.some((serie) => serie.pontos.some((ponto) => ponto.v !== null))
}

export function colorAt(indice: number): string {
  return PALETTE[indice % PALETTE.length]
}
