/**
 * Dados de demonstração, no mesmo formato das rotas /admin, para desenvolver as telas sem backend
 * (VITE_DEMO_MODE=true). Gerados com semente fixa por serviço: a mesma tela mostra os mesmos números.
 */
import type { ServiceConfig } from '../config'
import type { IaDashboard, IaReport, LangsmithRaw, Ponto, Serie, SpringDashboard } from './types'

function gerador(semente: string) {
  let estado = [...semente].reduce((soma, letra) => (soma * 31 + letra.charCodeAt(0)) >>> 0, 7)
  return () => {
    estado = (estado * 1664525 + 1013904223) >>> 0
    return estado / 0xffffffff
  }
}

function arredondar(valor: number, casas = 3): number {
  const fator = 10 ** casas
  return Math.round(valor * fator) / fator
}

function instantes(minutos: number, passoSegundos: number, fim: Date): string[] {
  const total = Math.max(2, Math.floor((minutos * 60) / passoSegundos))
  return Array.from({ length: total + 1 }, (_, i) =>
    new Date(fim.getTime() - (total - i) * passoSegundos * 1000).toISOString(),
  )
}

function serie(nome: string, tempos: string[], base: number, variacao: number, aleatorio: () => number): Serie {
  const pontos: Ponto[] = tempos.map((t, i) => ({
    t,
    v: arredondar(Math.max(0, base + Math.sin(i / 6) * variacao * 0.6 + (aleatorio() - 0.5) * variacao)),
  }))
  return { nome, pontos }
}

const URIS: Record<string, string[]> = {
  notify: ['/api/notifications', '/api/push/installations', '/actuator/health'],
  auth: ['/api/auth/login/password', '/api/auth/token/refresh', '/api/auth/google/authenticate'],
  core: ['/api/stock', '/api/shopping-lists', '/api/stores/nearby'],
}

export function demoSpringDashboard(service: ServiceConfig, minutos: number): SpringDashboard {
  const aleatorio = gerador(service.id)
  const fim = new Date()
  const passo = minutos <= 60 ? 60 : minutos <= 360 ? 300 : 600
  const tempos = instantes(minutos, passo, fim)
  const uris = URIS[service.id] ?? URIS.core
  const reinicioIndice = Math.floor(tempos.length * 0.55)
  const uptime: Ponto[] = tempos.map((t, i) => ({
    t,
    v: i < reinicioIndice ? 180 + (i * passo) / 60 : ((i - reinicioIndice) * passo) / 60,
  }))
  const mongo = service.id === 'notify'

  return {
    servico: `NexUs-${service.id[0].toUpperCase()}${service.id.slice(1)}`,
    janela: {
      inicio: new Date(fim.getTime() - minutos * 60_000).toISOString(),
      fim: fim.toISOString(),
      minutos,
      passoSegundos: passo,
      amostras: tempos.length,
    },
    http: {
      requisicoes: {
        atualPorSegundo: 12.4,
        series: [
          serie(uris[0], tempos, 5.5, 1.2, aleatorio),
          serie(uris[1], tempos, 3.1, 0.8, aleatorio),
          serie(uris[2], tempos, 2.2, 0.5, aleatorio),
          serie('demais', tempos, 1.1, 0.4, aleatorio),
        ],
      },
      taxaErro: {
        atualPct: 1.2,
        clientePct: 0.8,
        servidorPct: 0.4,
        series: [serie('4xx', tempos, 0.7, 0.4, aleatorio), serie('5xx', tempos, 0.35, 0.25, aleatorio)],
      },
      status: {
        total: 44640,
        classes: [
          { classe: '2xx', quantidade: 43613, percentual: 97.7 },
          { classe: '3xx', quantidade: 491, percentual: 1.1 },
          { classe: '4xx', quantidade: 357, percentual: 0.8 },
          { classe: '5xx', quantidade: 179, percentual: 0.4 },
        ],
      },
      latencia: {
        histograma: true,
        p50Ms: 142,
        p95Ms: 340,
        p99Ms: 620,
        mediaMs: 160,
        maximoMs: 980,
        series: [
          serie('p50', tempos, 140, 30, aleatorio),
          serie('p95', tempos, 330, 60, aleatorio),
          serie('p99', tempos, 600, 90, aleatorio),
        ],
      },
      endpointsMaisLentos: [
        ...uris.map((uri, i) => ({ uri, requisicoes: 900 - i * 210, mediaMs: 480 - i * 60, maximoMs: 980 - i * 70 })),
        { uri: '/actuator/prometheus', requisicoes: 60, mediaMs: 90, maximoMs: 210 },
        { uri: '/admin/metrics', requisicoes: 42, mediaMs: 55, maximoMs: 140 },
      ],
    },
    jvm: {
      heap: { usadoMb: 248, maximoMb: 512, series: [serie('usado', tempos, 240, 35, aleatorio)] },
      cpu: {
        processoPct: 18,
        sistemaPct: 27,
        series: [serie('processo', tempos, 17, 6, aleatorio), serie('sistema', tempos, 26, 7, aleatorio)],
      },
      gc: { pausaSegundosPorSegundo: 0.012, series: [serie('gc', tempos, 0.012, 0.01, aleatorio)] },
      threads: { atuais: 42, series: [serie('threads', tempos, 41, 5, aleatorio)] },
      uptime: {
        minutos: uptime[uptime.length - 1].v,
        iniciadoEm: tempos[reinicioIndice],
        reinicios: [tempos[reinicioIndice]],
        series: [{ nome: 'uptime', pontos: uptime }],
      },
    },
    banco: {
      disponivel: true,
      tipo: mongo ? 'mongodb' : 'postgres',
      capacidade: mongo ? 20 : 5,
      ativas: mongo ? 4 : 3,
      pendentes: 0,
      timeoutsNaJanela: mongo ? null : 0,
      series: [serie('ativas', tempos, mongo ? 4 : 2.5, 1.5, aleatorio), serie('pendentes', tempos, 0.1, 0.3, aleatorio)],
    },
    logs: { errosPorSegundo: 0.04, errosNaJanela: 3, series: [serie('error', tempos, 0.03, 0.05, aleatorio)] },
    entrega: mongo
      ? {
          criadas: 1260,
          enviadas: 1248,
          falhas: 12,
          invalidas: 3,
          entregaPct: 98.82,
          series: [serie('enviadas', tempos, 20, 8, aleatorio), serie('falhas', tempos, 0.2, 0.4, aleatorio)],
        }
      : undefined,
  }
}

function diasAte(dias: number, fim: Date): string[] {
  return Array.from({ length: dias }, (_, i) => {
    const dia = new Date(fim.getTime() - (dias - 1 - i) * 86_400_000)
    return `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`
  })
}

const ROTAS_IA = ['estoque', 'receitas', 'eventos', 'faq']
const ROTAS_BI = ['analyst', 'recommender', 'faq']

export function demoIaDashboard(service: ServiceConfig, dias: number): IaDashboard {
  const aleatorio = gerador(`${service.id}-${dias}`)
  const fim = new Date()
  const bi = service.id === 'bi-ia'
  const rotas = bi ? ROTAS_BI : ROTAS_IA
  const modelo = bi ? 'gemini-2.5-flash' : 'openai/gpt-oss-20b'
  const listaDias = diasAte(Math.max(dias, 1), fim)
  const execucoes = 540 * Math.max(dias, 1)

  return {
    servico: bi ? 'ceris-bi-ia' : 'ceris-ia',
    janela: { inicio: new Date(fim.getTime() - dias * 86_400_000).toISOString(), fim: fim.toISOString(), dias },
    resumo: {
      execucoes,
      p50_e2e_s: 1.4,
      p95_e2e_s: 2.8,
      custo_usd: arredondar(0.54 * dias, 2),
      taxa_erro_pct: 2,
      devolucoes_juiz_pct: 8,
    },
    desempenho: {
      latencia_por_rota: rotas.map((rota, i) => ({
        rota,
        execucoes: Math.round(execucoes / rotas.length),
        erros: 3 + i,
        p50_s: arredondar(1 + i * 0.35 + aleatorio() * 0.2, 2),
        p95_s: arredondar(2 + i * 0.6 + aleatorio() * 0.5, 2),
      })),
      latencia_por_no: rotas.map((rota, i) => ({
        rota,
        execucoes: Math.round(execucoes / rotas.length),
        total_s: arredondar(1.1 + i * 0.4, 2),
        etapas_s: {
          roteador: arredondar(0.15 + aleatorio() * 0.1, 2),
          agente: arredondar(0.6 + i * 0.3, 2),
          juiz: arredondar(0.2 + aleatorio() * 0.15, 2),
          guardrails: 0.06,
          orquestrador: bi ? 0 : arredondar(0.12 + aleatorio() * 0.1, 2),
        },
      })),
    },
    leitura_nota: bi
      ? null
      : { leituras: 600, sucesso: 588, taxa_sucesso_pct: 98, tempo_medio_s: 1.4, p95_s: 2.3 },
    custo: {
      tokens: {
        limite_diario: bi ? null : 200_000,
        total_entrada: 665_000,
        total_saida: 285_000,
        pico: { dia: listaDias[listaDias.length - 1], total: 152_500, pct_do_limite: bi ? null : 76.25 },
        dias: listaDias.map((dia) => {
          const porRota: Record<string, { entrada: number; saida: number }> = {}
          let entrada = 0
          let saida = 0
          for (const rota of rotas) {
            const e = Math.round(18_000 + aleatorio() * 14_000)
            const s = Math.round(e * 0.42)
            porRota[rota] = { entrada: e, saida: s }
            entrada += e
            saida += s
          }
          return { dia, entrada, saida, total: entrada + saida, por_rota: porRota }
        }),
      },
      custo: {
        total_usd: arredondar(0.54 * dias, 2),
        por_modelo: { [modelo]: arredondar(0.4 * dias, 2), [bi ? 'gemini-2.5-flash-lite' : 'qwen/qwen3.8-27b']: arredondar(0.14 * dias, 2) },
        dias: listaDias.map((dia) => ({
          dia,
          total_usd: arredondar(0.54 + aleatorio() * 0.1, 3),
          por_modelo: {
            [modelo]: arredondar(0.36 + aleatorio() * 0.08, 3),
            [bi ? 'gemini-2.5-flash-lite' : 'qwen/qwen3.8-27b']: arredondar(0.14 + aleatorio() * 0.06, 3),
          },
        })),
      },
      erros_de_cota: {
        total_24h: 6,
        total_janela: 28,
        por_hora: Array.from({ length: 24 }, (_, i) => ({
          hora: new Date(fim.getTime() - (23 - i) * 3_600_000).toISOString(),
          quantidade: [9, 13, 14, 16].includes(i) ? Math.round(1 + aleatorio() * 2) : 0,
        })),
      },
    },
    qualidade: {
      juiz: {
        total: 3800,
        aprovado: { quantidade: 3420, pct: 90 },
        devolvido: { quantidade: 304, pct: 8 },
        revertido: bi ? { quantidade: 0, pct: 0 } : { quantidade: 76, pct: 2 },
      },
      guardrails: { execucoes, entrada: 38, saida: 19, total: 57, pct: 1.5 },
      ferramentas: (bi
        ? ['search_reports_by_period', 'get_latest_reports', 'search_faq', 'search_context']
        : ['get_stock', 'estimar_validade', 'tavily_search', 'registrar_evento']
      ).map((tool, i) => ({
        tool,
        chamadas: 1520 - i * 380,
        erros: [15, 23, 30, 8][i],
        taxa_erro_pct: arredondar(([15, 23, 30, 8][i] / (1520 - i * 380)) * 100, 2),
        media_ms: [180, 420, 780, 260][i],
        p95_ms: [420, 900, 1600, 520][i],
      })),
    },
  }
}

export function demoIaReport(service: ServiceConfig, dias: number): IaReport {
  const painel = demoIaDashboard(service, dias)
  const fim = new Date()
  const inicio = new Date(fim.getTime() - dias * 86_400_000)
  const anterior = new Date(inicio.getTime() - dias * 86_400_000)
  return {
    gerado_em: fim.toISOString(),
    periodo_atual: { inicio: inicio.toISOString(), fim: fim.toISOString() },
    periodo_anterior: { inicio: anterior.toISOString(), fim: inicio.toISOString() },
    indicadores: [
      { indicador: 'volume', unidade: 'execucoes', atual: painel.resumo.execucoes, anterior: Math.round(painel.resumo.execucoes / 1.11), variacao: 11.1, variacao_em: 'pct' },
      { indicador: 'latencia_p95_e2e_s', unidade: 's', atual: 2.8, anterior: 3.1, variacao: -9.68, variacao_em: 'pct' },
      { indicador: 'custo_usd', unidade: 'usd', atual: painel.resumo.custo_usd, anterior: arredondar(painel.resumo.custo_usd * 1.1, 2), variacao: -9.09, variacao_em: 'pct' },
      { indicador: 'taxa_erro_pct', unidade: '%', atual: 2, anterior: 2.5, variacao: -0.5, variacao_em: 'pontos' },
      { indicador: 'devolucoes_juiz_pct', unidade: '%', atual: 8, anterior: 10, variacao: -2, variacao_em: 'pontos' },
    ],
    rotas_mais_lentas: [...painel.desempenho.latencia_por_rota].sort((a, b) => b.p95_s - a.p95_s).slice(0, 3),
    tools_com_mais_erro: [...painel.qualidade.ferramentas].sort((a, b) => b.taxa_erro_pct - a.taxa_erro_pct).slice(0, 3),
    consumo: {
      tokens_entrada: painel.custo.tokens.total_entrada,
      tokens_saida: painel.custo.tokens.total_saida,
      pico_diario: painel.custo.tokens.pico,
      limite_diario: painel.custo.tokens.limite_diario,
    },
    leitura_nota: painel.leitura_nota,
    juiz: { total: painel.qualidade.juiz.total },
  }
}

export function demoLangsmith(service: ServiceConfig, dias: number): LangsmithRaw {
  const aleatorio = gerador(`ls-${service.id}`)
  const bi = service.id === 'bi-ia'
  const lista = diasAte(Math.max(dias, 1), new Date())
  const chains = bi
    ? ['input_guardrail', 'router', 'specialist', 'judge', 'finish']
    : ['guardrail_entrada', 'roteador', 'juiz', 'orquestrador', 'guardrail_saida']
  const agentes = bi ? ['analyst', 'recommender', 'faq'] : ['agente_estoque', 'agente_receitas', 'agente_eventos', 'agente_faq']
  const latencias = (nomes: string[]) =>
    nomes.map((nome, i) => ({
      nome,
      chamadas: 600 - i * 40,
      p50_s: arredondar(0.3 + i * 0.25 + aleatorio() * 0.2, 2),
      p99_s: arredondar(1.2 + i * 0.7 + aleatorio() * 0.6, 2),
    }))

  return {
    disponivel: true,
    projeto: bi ? 'ceris-ms-ia-bi' : 'ceris-ms-ia',
    execucoes_por_dia: lista.map((dia) => {
      const execucoes = Math.round(480 + aleatorio() * 150)
      const erros = Math.round(execucoes * (0.015 + aleatorio() * 0.012))
      return { dia, execucoes, erros, taxa_erro_pct: arredondar((erros / execucoes) * 100, 2) }
    }),
    ...(bi
      ? { latencia_por_chain: latencias(chains), latencia_por_agente: latencias(agentes) }
      : { etapas: latencias(chains), agentes: latencias(agentes) }),
    feedback: { disponivel: true, total: 0, por_chave: {} },
  }
}
