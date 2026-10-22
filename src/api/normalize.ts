import type { LangsmithRaw, LangsmithSection } from './types'

type LatenciaCrua = { nome: string; chamadas: number; p50_s?: number; p99_s?: number; p95_s?: number }

function latencias(itens: LatenciaCrua[] | undefined) {
  return (itens ?? []).map((item) => ({
    nome: item.nome,
    chamadas: item.chamadas,
    p50: item.p50_s ?? 0,
    // Relatórios antigos da IA só tinham p95: melhor mostrar o p95 do que zero.
    p99: item.p99_s ?? item.p95_s ?? 0,
  }))
}

/**
 * Junta os dois formatos de /admin/langsmith num só.
 *
 * A IA devolve as chains em "etapas" e os agentes em "agentes", e sinaliza projeto ausente com "erro".
 * O BI IA devolve "latencia_por_chain", "latencia_por_agente" e "disponivel".
 */
export function normalizeLangsmith(raw: LangsmithRaw): LangsmithSection {
  const disponivel = raw.disponivel ?? !raw.erro
  const feedback = raw.feedback

  return {
    disponivel,
    motivo: raw.erro ?? null,
    projeto: raw.projeto ?? null,
    porDia: (raw.execucoes_por_dia ?? []).map((linha) => ({
      dia: linha.dia,
      execucoes: linha.execucoes,
      erros: linha.erros,
      taxaErroPct: linha.taxa_erro_pct,
    })),
    chains: latencias(raw.latencia_por_chain ?? raw.etapas),
    agentes: latencias(raw.latencia_por_agente ?? raw.agentes),
    feedback: {
      disponivel: feedback?.disponivel ?? false,
      total: feedback?.total ?? 0,
      porChave: Object.entries(feedback?.por_chave ?? {}).map(([chave, valor]) => ({
        chave,
        avaliacoes: valor.avaliacoes,
        media: valor.media,
      })),
    },
  }
}
