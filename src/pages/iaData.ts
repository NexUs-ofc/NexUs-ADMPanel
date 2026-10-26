/** Transformações dos dados da IA para os gráficos de barras. Puras, para serem testadas sem tela. */
import type { BarKey } from '../components/charts/Charts'
import { colorAt } from '../components/charts/data'
import type { IaDashboard } from '../api/types'

export const ETAPAS = [
  { chave: 'roteador', nome: 'Roteador', cor: '#b9a3e0' },
  { chave: 'agente', nome: 'Agente', cor: '#4b1d78' },
  { chave: 'juiz', nome: 'Juiz', cor: '#8e5bc8' },
  { chave: 'guardrails', nome: 'Guardrails', cor: '#5b8dd6' },
  { chave: 'orquestrador', nome: 'Orquestrador', cor: '#d9922e' },
]

/** Rotas na ordem em que aparecem nos dados, sem repetir. */
export function rotasDosTokens(painel: IaDashboard): string[] {
  const rotas: string[] = []
  for (const dia of painel.custo.tokens.dias) {
    for (const rota of Object.keys(dia.por_rota)) {
      if (!rotas.includes(rota)) {
        rotas.push(rota)
      }
    }
  }
  return rotas
}

/**
 * Tokens por dia empilhados por rota, entrada e saída separadas: a mesma cor por rota, a saída
 * mais clara. Uma pilha só por dia, para comparar com a linha do limite diário.
 */
export function tokensPorDia(painel: IaDashboard): { linhas: Record<string, string | number>[]; chaves: BarKey[] } {
  const rotas = rotasDosTokens(painel)
  const linhas = painel.custo.tokens.dias.map((dia) => {
    const linha: Record<string, string | number> = { dia: dia.dia }
    for (const rota of rotas) {
      linha[`${rota}__entrada`] = dia.por_rota[rota]?.entrada ?? 0
      linha[`${rota}__saida`] = dia.por_rota[rota]?.saida ?? 0
    }
    return linha
  })
  const chaves: BarKey[] = rotas.flatMap((rota, i) => [
    { chave: `${rota}__entrada`, nome: `${rota} · input`, cor: colorAt(i), pilha: 'tokens' },
    { chave: `${rota}__saida`, nome: `${rota} · output`, cor: `${colorAt(i)}80`, pilha: 'tokens' },
  ])
  return { linhas, chaves }
}

export function custoPorDia(painel: IaDashboard): { linhas: Record<string, string | number>[]; chaves: BarKey[] } {
  const modelos = Object.keys(painel.custo.custo.por_modelo)
  for (const dia of painel.custo.custo.dias) {
    for (const modelo of Object.keys(dia.por_modelo)) {
      if (!modelos.includes(modelo)) {
        modelos.push(modelo)
      }
    }
  }
  const linhas = painel.custo.custo.dias.map((dia) => {
    const linha: Record<string, string | number> = { dia: dia.dia }
    for (const modelo of modelos) {
      linha[modelo] = dia.por_modelo[modelo] ?? 0
    }
    return linha
  })
  const chaves: BarKey[] = modelos.map((modelo, i) => ({
    chave: modelo,
    nome: modelo,
    cor: i === 0 ? '#4b1d78' : colorAt(i + 3),
    pilha: 'custo',
  }))
  return { linhas, chaves }
}

export function etapasPorRota(painel: IaDashboard): Record<string, string | number>[] {
  return painel.desempenho.latencia_por_no.map((linha) => {
    const resultado: Record<string, string | number> = { rota: linha.rota }
    for (const etapa of ETAPAS) {
      resultado[etapa.chave] = linha.etapas_s[etapa.chave] ?? 0
    }
    return resultado
  })
}

/** Etapas que aparecem em pelo menos uma rota: o BI IA não tem orquestrador separado. */
export function etapasPresentes(painel: IaDashboard): typeof ETAPAS {
  return ETAPAS.filter((etapa) =>
    painel.desempenho.latencia_por_no.some((linha) => (linha.etapas_s[etapa.chave] ?? 0) > 0),
  )
}
