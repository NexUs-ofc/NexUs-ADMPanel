/**
 * Contratos das rotas /admin de cada serviço. Espelham o docs/painel-admin.md de cada repositório.
 * Valor null quer dizer que o serviço não tem o medidor ou que não houve tráfego para calcular.
 */

// ---------------------------------------------------------------- comum

export interface AdminSession {
  servico: string
  autenticado: boolean
  verificadoEm?: string
  verificado_em?: string
}

// ---------------------------------------------------------------- Auth, Core e Notify (Spring)

export interface Ponto {
  t: string
  v: number | null
}

export interface Serie {
  nome: string
  pontos: Ponto[]
}

export interface ClasseStatus {
  classe: string
  quantidade: number
  percentual: number | null
}

export interface EndpointLento {
  uri: string
  requisicoes: number
  mediaMs: number | null
  maximoMs: number | null
}

export interface SpringDashboard {
  servico: string
  janela: { inicio: string; fim: string; minutos: number; passoSegundos: number; amostras: number }
  http: {
    requisicoes: { atualPorSegundo: number | null; series: Serie[] }
    taxaErro: { atualPct: number | null; clientePct: number | null; servidorPct: number | null; series: Serie[] }
    status: { total: number; classes: ClasseStatus[] }
    latencia: {
      histograma: boolean
      p50Ms: number | null
      p95Ms: number | null
      p99Ms: number | null
      mediaMs: number | null
      maximoMs: number | null
      series: Serie[]
    }
    endpointsMaisLentos: EndpointLento[]
  }
  jvm: {
    heap: { usadoMb: number | null; maximoMb: number | null; series: Serie[] }
    cpu: { processoPct: number | null; sistemaPct: number | null; series: Serie[] }
    gc: { pausaSegundosPorSegundo: number | null; series: Serie[] }
    threads: { atuais: number | null; series: Serie[] }
    uptime: { minutos: number | null; iniciadoEm: string | null; reinicios: string[]; series: Serie[] }
  }
  banco: {
    disponivel: boolean
    tipo: string | null
    capacidade: number | null
    ativas: number | null
    pendentes: number | null
    timeoutsNaJanela: number | null
    series: Serie[]
  }
  logs: { errosPorSegundo: number | null; errosNaJanela: number | null; series: Serie[] }
  /** Só no Notify. */
  entrega?: {
    criadas: number
    enviadas: number
    falhas: number
    invalidas: number
    entregaPct: number | null
    series: Serie[]
  }
}

// ---------------------------------------------------------------- IA e BI IA

export interface LatenciaRota {
  rota: string
  execucoes: number
  erros: number
  p50_s: number
  p95_s: number
}

export interface EtapasRota {
  rota: string
  execucoes: number
  total_s: number
  etapas_s: Record<string, number>
}

export interface TokensDia {
  dia: string
  entrada: number
  saida: number
  total: number
  por_rota: Record<string, { entrada: number; saida: number }>
}

export interface CustoDia {
  dia: string
  total_usd: number
  por_modelo: Record<string, number>
}

export interface Ferramenta {
  tool: string
  chamadas: number
  erros: number
  taxa_erro_pct: number
  media_ms: number
  p95_ms: number
}

export interface Decisao {
  quantidade: number
  pct: number
}

export interface Resumo {
  execucoes: number
  p50_e2e_s: number
  p95_e2e_s: number
  custo_usd: number
  taxa_erro_pct: number
  devolucoes_juiz_pct: number
}

export interface LeituraNota {
  leituras: number
  sucesso: number
  taxa_sucesso_pct: number
  tempo_medio_s: number
  p95_s: number
}

export interface IaDashboard {
  servico: string
  janela: { inicio: string; fim: string; dias: number }
  resumo: Resumo
  desempenho: { latencia_por_rota: LatenciaRota[]; latencia_por_no: EtapasRota[] }
  leitura_nota: LeituraNota | null
  custo: {
    tokens: {
      limite_diario: number | null
      total_entrada: number
      total_saida: number
      pico: { dia: string; total: number; pct_do_limite: number | null } | null
      dias: TokensDia[]
    }
    custo: { total_usd: number; por_modelo: Record<string, number>; dias: CustoDia[] }
    erros_de_cota: { total_24h: number; total_janela: number; por_hora: { hora: string; quantidade: number }[] }
  }
  qualidade: {
    juiz: { total: number; aprovado: Decisao; devolvido: Decisao; revertido: Decisao }
    guardrails: { execucoes: number; entrada: number; saida: number; total: number; pct: number }
    ferramentas: Ferramenta[]
  }
}

export interface Indicador {
  indicador: string
  unidade: string
  atual: number
  anterior: number
  variacao: number | null
  variacao_em: 'pct' | 'pontos'
}

export interface IaReport {
  gerado_em: string
  periodo_atual: { inicio: string; fim: string }
  periodo_anterior: { inicio: string; fim: string }
  indicadores: Indicador[]
  rotas_mais_lentas: LatenciaRota[]
  tools_com_mais_erro: Ferramenta[]
  consumo: {
    tokens_entrada: number
    tokens_saida: number
    pico_diario: { dia: string; total: number; pct_do_limite?: number | null } | null
    limite_diario: number | null
  }
  leitura_nota: LeituraNota | null
  juiz: { total: number }
}

/** Resposta crua de /admin/langsmith: o formato muda entre IA e BI IA. */
export interface LangsmithRaw {
  disponivel?: boolean
  erro?: string
  projeto?: string
  execucoes_por_dia?: { dia: string; execucoes: number; erros: number; taxa_erro_pct: number }[]
  // IA
  etapas?: { nome: string; chamadas: number; p50_s?: number; p99_s?: number; p95_s?: number }[]
  agentes?: { nome: string; chamadas: number; p50_s?: number; p99_s?: number; p95_s?: number }[]
  // BI IA
  latencia_por_chain?: { nome: string; chamadas: number; p50_s: number; p99_s: number }[]
  latencia_por_agente?: { nome: string; chamadas: number; p50_s: number; p99_s: number }[]
  feedback?: { disponivel: boolean; total: number; por_chave: Record<string, { avaliacoes: number; media: number | null }> }
}

/** Seção do LangSmith já no formato único que a página desenha. */
export interface LangsmithSection {
  disponivel: boolean
  motivo: string | null
  projeto: string | null
  porDia: { dia: string; execucoes: number; erros: number; taxaErroPct: number }[]
  chains: { nome: string; chamadas: number; p50: number; p99: number }[]
  agentes: { nome: string; chamadas: number; p50: number; p99: number }[]
  feedback: { disponivel: boolean; total: number; porChave: { chave: string; avaliacoes: number; media: number | null }[] }
}
