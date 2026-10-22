import { describe, expect, it } from 'vitest'
import { demoIaDashboard } from '../api/demo'
import type { ServiceConfig } from '../config'
import { custoPorDia, etapasPresentes, tokensPorDia } from './iaData'

const IA: ServiceConfig = { id: 'ia', kind: 'ia', label: 'API Ceris IA', application: 'ia', baseUrl: '' }
const BI: ServiceConfig = { id: 'bi-ia', kind: 'ia', label: 'API Ceris BI IA', application: 'bi-ia', baseUrl: '' }

describe('transformações da página de IA', () => {
  it('tokens: uma pilha por dia, entrada e saída de cada rota', () => {
    const painel = demoIaDashboard(IA, 7)
    const { linhas, chaves } = tokensPorDia(painel)

    expect(linhas).toHaveLength(7)
    expect(chaves).toHaveLength(8) // 4 rotas × entrada/saída
    expect(new Set(chaves.map((k) => k.pilha))).toEqual(new Set(['tokens']))

    const dia = painel.custo.tokens.dias[0]
    const soma = Object.entries(linhas[0])
      .filter(([chave]) => chave !== 'dia')
      .reduce((total, [, valor]) => total + Number(valor), 0)
    expect(soma).toBe(dia.total)
  })

  it('custo: uma coluna por modelo, mesmo os que só aparecem em alguns dias', () => {
    const { chaves, linhas } = custoPorDia(demoIaDashboard(IA, 3))

    expect(chaves.map((k) => k.chave)).toContain('openai/gpt-oss-20b')
    expect(linhas.every((linha) => chaves.every((k) => k.chave in linha))).toBe(true)
  })

  it('BI IA não desenha a etapa de orquestrador, que é sempre zero', () => {
    expect(etapasPresentes(demoIaDashboard(BI, 7)).map((e) => e.chave)).not.toContain('orquestrador')
    expect(etapasPresentes(demoIaDashboard(IA, 7)).map((e) => e.chave)).toContain('orquestrador')
  })
})
