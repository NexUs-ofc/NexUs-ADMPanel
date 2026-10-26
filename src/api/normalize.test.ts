import { describe, expect, it } from 'vitest'
import { normalizeLangsmith } from './normalize'

describe('normalizeLangsmith', () => {
  it('lê o formato da IA: etapas, agentes e projeto ausente como erro', () => {
    const secao = normalizeLangsmith({
      erro: "Projeto 'x' não encontrado no LangSmith.",
      projeto: 'x',
    })

    expect(secao.disponivel).toBe(false)
    expect(secao.motivo).toContain('não encontrado')
    expect(secao.chains).toEqual([])
  })

  it('usa p99 da IA e cai no p95 em relatório antigo', () => {
    const secao = normalizeLangsmith({
      execucoes_por_dia: [{ dia: '2026-10-20', execucoes: 10, erros: 1, taxa_erro_pct: 10 }],
      etapas: [
        { nome: 'juiz', chamadas: 5, p50_s: 0.4, p99_s: 1.2 },
        { nome: 'roteador', chamadas: 5, p50_s: 0.2, p95_s: 0.9 },
      ],
      agentes: [{ nome: 'agente_estoque', chamadas: 3, p50_s: 2, p99_s: 6 }],
      feedback: { disponivel: true, total: 2, por_chave: { nota: { avaliacoes: 2, media: 0.5 } } },
    })

    expect(secao.disponivel).toBe(true)
    expect(secao.chains).toEqual([
      { nome: 'juiz', chamadas: 5, p50: 0.4, p99: 1.2 },
      { nome: 'roteador', chamadas: 5, p50: 0.2, p99: 0.9 },
    ])
    expect(secao.agentes[0].p99).toBe(6)
    expect(secao.porDia[0].taxaErroPct).toBe(10)
    expect(secao.feedback.porChave).toEqual([{ chave: 'nota', avaliacoes: 2, media: 0.5 }])
  })

  it('lê o formato do BI IA: latencia_por_chain e latencia_por_agente', () => {
    const secao = normalizeLangsmith({
      disponivel: true,
      latencia_por_chain: [{ nome: 'judge', chamadas: 2, p50_s: 1, p99_s: 3 }],
      latencia_por_agente: [{ nome: 'analyst', chamadas: 2, p50_s: 1.1, p99_s: 4 }],
    })

    expect(secao.chains[0].nome).toBe('judge')
    expect(secao.agentes[0].nome).toBe('analyst')
    expect(secao.feedback.total).toBe(0)
  })
})
