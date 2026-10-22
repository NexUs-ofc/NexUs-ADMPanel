/** Formatação em pt-BR. Valor nulo ou não finito vira travessão: o painel nunca mostra "NaN". */

const TRACO = '—'

function valido(valor: number | null | undefined): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor)
}

export function formatNumber(valor: number | null | undefined, casas = 0): string {
  if (!valido(valor)) {
    return TRACO
  }
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

/** Até 2 casas, sem zeros sobrando: 12,4 e não 12,40. */
export function formatCompact(valor: number | null | undefined): string {
  if (!valido(valor)) {
    return TRACO
  }
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: Math.abs(valor) < 1 ? 3 : 2 })
}

export function formatPct(valor: number | null | undefined, casas = 2): string {
  return valido(valor) ? `${formatNumber(valor, casas)}%` : TRACO
}

export function formatUsd(valor: number | null | undefined, casas = 2): string {
  return valido(valor) ? `US$ ${formatNumber(valor, casas)}` : TRACO
}

export function formatMs(valor: number | null | undefined): string {
  return valido(valor) ? `${formatNumber(valor, 0)} ms` : TRACO
}

export function formatSeconds(valor: number | null | undefined): string {
  return valido(valor) ? `${formatNumber(valor, valor < 10 ? 2 : 1)} s` : TRACO
}

/** 150000 vira "150 mil", 1200000 vira "1,2 mi". */
export function formatTokens(valor: number | null | undefined): string {
  if (!valido(valor)) {
    return TRACO
  }
  if (Math.abs(valor) >= 1_000_000) {
    return `${formatCompact(valor / 1_000_000)} mi`
  }
  if (Math.abs(valor) >= 1_000) {
    return `${formatCompact(valor / 1_000)} mil`
  }
  return formatNumber(valor)
}

/** Variação com sinal: +9,7% ou -0,5 p.p. */
export function formatChange(valor: number | null | undefined, emPontos: boolean): string {
  if (!valido(valor)) {
    return TRACO
  }
  const sinal = valor > 0 ? '+' : ''
  return emPontos ? `${sinal}${formatNumber(valor, 2)} p.p.` : `${sinal}${formatNumber(valor, 2)}%`
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** "2026-10-14" vira "14 out". Dia sem hora: não passa por fuso, senão volta um dia. */
export function formatDay(dia: string): string {
  const [ano, mes, d] = dia.slice(0, 10).split('-').map(Number)
  return new Date(ano, mes - 1, d)
    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    .replace(/\./g, '')
    .replace(/ de /g, ' ')
}

/** Faixa de datas do chip de período: "14–20 out 2026" ou "21 out 2026 · 09h–10h". */
export function formatPeriod(inicioIso: string, fimIso: string): string {
  const inicio = new Date(inicioIso)
  const fim = new Date(fimIso)
  const mesmoDia = inicio.toDateString() === fim.toDateString()
  const data = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, '').replace(/ de /g, ' ')
  if (mesmoDia) {
    const hora = (d: Date) => `${String(d.getHours()).padStart(2, '0')}h${d.getMinutes() ? String(d.getMinutes()).padStart(2, '0') : ''}`
    return `${data(fim)} · ${hora(inicio)}–${hora(fim)}`
  }
  return `${data(inicio)} – ${data(fim)}`
}

/** Nome da rota ou nó para leitura: "agente_estoque" vira "Agente estoque". */
export function humanize(nome: string): string {
  const texto = nome.replace(/[_-]+/g, ' ').trim()
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}
