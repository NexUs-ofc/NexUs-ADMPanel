import { useState } from 'react'
import { fetchSpringDashboard } from '../api/services'
import type { SpringDashboard } from '../api/types'
import { DonutChart, TimeSeriesChart } from '../components/charts/Charts'
import { COLOR } from '../components/charts/data'
import { PageHeader } from '../components/PageHeader'
import { Card, DataTable, Empty, ErrorBanner, InfoBanner, Kpi, PageSkeleton, Section } from '../components/ui'
import { SPRING_REFRESH_MS, SPRING_WINDOWS, type ServiceConfig } from '../config'
import { useAdminQuery } from '../hooks/useAdminQuery'
import { formatCompact, formatMs, formatNumber, formatPct, formatPeriod } from '../utils/format'

const COR_STATUS: Record<string, string> = {
  '2xx': COLOR.roxo,
  '3xx': COLOR.lilasClaro,
  '4xx': COLOR.laranja,
  '5xx': COLOR.vermelho,
  outros: COLOR.cinza,
}

/** Rótulo e janela do rate() mostrados nas fórmulas, a partir do passo de amostragem. */
function janelaRate(passoSegundos: number): string {
  return passoSegundos % 60 === 0 ? `${passoSegundos / 60}m` : `${passoSegundos}s`
}

export function SpringServicePage({ service }: { service: ServiceConfig }) {
  const [minutos, setMinutos] = useState(60)
  const consulta = useAdminQuery(
    (key, signal) => fetchSpringDashboard(service, key, minutos, signal),
    [service.id, minutos],
    { refreshMs: SPRING_REFRESH_MS },
  )
  const { data, error, loading, updatedAt, reload } = consulta
  const filtro = `{application="${service.application}"}`

  const seletor = (
    <select
      className="seletor"
      value={minutos}
      onChange={(e) => setMinutos(Number(e.target.value))}
      aria-label="Janela de tempo"
    >
      {SPRING_WINDOWS.map((janela) => (
        <option key={janela.minutos} value={janela.minutos}>
          {janela.label}
        </option>
      ))}
    </select>
  )

  return (
    <>
      <PageHeader
        titulo={service.label}
        subtitulo={`Observabilidade · métricas do Micrometer · atualiza a cada ${SPRING_REFRESH_MS / 1000} s`}
        chips={[
          `application="${service.application}"`,
          data ? `Período: ${formatPeriod(data.janela.inicio, data.janela.fim)}` : 'Período: carregando',
        ]}
        filtro={`Filtro global aplicado a todas as consultas: ${filtro}.`}
        acoes={seletor}
        carregando={loading}
        atualizadoEm={updatedAt}
        onRefresh={reload}
      />

      {error && (
        <ErrorBanner titulo={`Não foi possível carregar ${service.label}`} mensagem={error.message} onRetry={reload} />
      )}

      {!data && loading && <PageSkeleton />}

      {data && <SpringDashboardView data={data} serviceId={service.id} />}
    </>
  )
}

function SpringDashboardView({ data, serviceId }: { data: SpringDashboard; serviceId: string }) {
  const { http, jvm, banco, logs, entrega } = data
  const rate = janelaRate(data.janela.passoSegundos)
  const poucasAmostras = data.janela.amostras < 3

  return (
    <>
      {poucasAmostras && (
        <InfoBanner titulo="Histórico ainda curto">
          O serviço guarda uma amostra por {data.janela.passoSegundos} s desde que subiu. Os gráficos ganham forma
          nos próximos minutos.
        </InfoBanner>
      )}

      {serviceId === 'notify' && (
        <article className="cartao">
          <h3 className="cartao__titulo">Entrega de notificações</h3>
          <p className="cartao__subtitulo">Tentativas de push na janela · contador notify.push.deliveries por desfecho</p>
          {entrega ? (
            <div className="kpis">
              <Kpi valor={formatNumber(entrega.enviadas)} rotulo="Enviadas" />
              <Kpi valor={formatNumber(entrega.falhas)} rotulo="Falhas" alerta={entrega.falhas > 0} />
              <Kpi valor={formatNumber(entrega.invalidas)} rotulo="Instalações inválidas" />
              <Kpi valor={formatPct(entrega.entregaPct)} rotulo="Entrega" />
              <Kpi valor={formatNumber(entrega.criadas)} rotulo="Notificações criadas" />
            </div>
          ) : (
            <Empty>O serviço ainda não informa a entrega.</Empty>
          )}
        </article>
      )}

      <Section numero="01" titulo="HTTP" descricao={`5 visões de tráfego, erros e latência · janela de taxa de ${rate}`}>
        <Card
          titulo="1. Requisições por segundo / endpoint"
          subtitulo={`req/s · total atual ${formatCompact(http.requisicoes.atualPorSegundo)} · agrupamento por uri`}
          formula={`sum by(uri)(rate(http_server_requests_seconds_count[${rate}]))`}
        >
          <TimeSeriesChart series={http.requisicoes.series} formatar={formatCompact} />
        </Card>

        <Card
          titulo="2. Taxa de erros HTTP"
          subtitulo={`% do total · atual ${formatPct(http.taxaErro.atualPct)} = ${formatPct(http.taxaErro.clientePct)} + ${formatPct(http.taxaErro.servidorPct)}`}
          formula={`100 * sum(rate(http_server_requests_seconds_count{outcome="CLIENT_ERROR"}[${rate}])) / sum(rate(http_server_requests_seconds_count[${rate}]))`}
        >
          <TimeSeriesChart
            series={http.taxaErro.series}
            formatar={(v) => formatPct(v)}
            cores={{ '4xx': COLOR.laranja, '5xx': COLOR.vermelho }}
            rotulos={{ '4xx': '4xx · CLIENT_ERROR', '5xx': '5xx · SERVER_ERROR' }}
          />
        </Card>

        <Card
          titulo="3. Distribuição de status HTTP"
          subtitulo={`Pizza · ${formatNumber(http.status.total)} requisições na janela`}
          formula="sum by(status)(increase(http_server_requests_seconds_count[janela]))"
        >
          <DonutChart
            fatias={http.status.classes.map((classe) => ({
              nome: classe.classe,
              valor: classe.quantidade,
              cor: COR_STATUS[classe.classe] ?? COLOR.cinza,
              detalhe: `${formatNumber(classe.quantidade)} · ${formatPct(classe.percentual, 1)}`,
            }))}
            formatar={(v) => formatNumber(v)}
          />
        </Card>

        <Card
          titulo={http.latencia.histograma ? '4. Latência HTTP · p50 / p95 / p99' : '4. Latência HTTP · média e máximo'}
          subtitulo={
            http.latencia.histograma
              ? `ms · atual ${formatNumber(http.latencia.p50Ms)} / ${formatNumber(http.latencia.p95Ms)} / ${formatNumber(http.latencia.p99Ms)}`
              : `ms · média ${formatMs(http.latencia.mediaMs)} · máximo ${formatMs(http.latencia.maximoMs)}`
          }
          formula={
            http.latencia.histograma
              ? `histogram_quantile(0.50 | 0.95 | 0.99, sum by(le)(rate(http_server_requests_seconds_bucket[${rate}]))) * 1000`
              : 'rate(http_server_requests_seconds_sum) / rate(http_server_requests_seconds_count); máximo = http_server_requests_seconds_max'
          }
        >
          <TimeSeriesChart
            series={http.latencia.series}
            formatar={(v) => `${formatNumber(v)} ms`}
            cores={{ p50: COLOR.lilasClaro, p95: COLOR.lilas, p99: COLOR.roxo, media: COLOR.lilas, maximo: COLOR.roxo }}
          />
        </Card>

        {!http.latencia.histograma && (
          <article className="cartao cartao--inteiro">
            <h3 className="cartao__titulo">Histograma de latência · configuração necessária</h3>
            <p className="cartao__formula mono">management.metrics.distribution.percentiles-histogram.http.server.requests=true</p>
            <p className="cartao__subtitulo">
              Sem buckets o serviço não tem percentis: o gráfico mostra média e máximo. Os percentis aparecem depois
              de ligar a propriedade acima.
            </p>
          </article>
        )}

        <Card
          titulo="5. Top 10 endpoints mais lentos"
          subtitulo="Média decrescente · soma ÷ contagem por uri · máximo: http_server_requests_seconds_max"
          inteiro
        >
          <DataTable
            vazio="Nenhuma requisição na janela."
            linhas={http.endpointsMaisLentos}
            colunas={[
              { titulo: '#', valor: (_, i) => String(i + 1).padStart(2, '0') },
              { titulo: 'URI', valor: (linha) => <span className="mono">{linha.uri}</span> },
              { titulo: 'Requisições', valor: (linha) => formatNumber(linha.requisicoes), numero: true },
              { titulo: 'Média (ms)', valor: (linha) => formatNumber(linha.mediaMs), numero: true },
              { titulo: 'Máximo (ms)', valor: (linha) => formatNumber(linha.maximoMs), numero: true },
            ]}
          />
        </Card>
      </Section>

      <Section numero="02" titulo="JVM" descricao="5 visões do processo · unidades e limites separados">
        <Card
          titulo="6. Heap utilizada × máxima"
          subtitulo={`MB · área heap · atual ${formatNumber(jvm.heap.usadoMb)} / ${formatNumber(jvm.heap.maximoMb)} MB`}
          formula={'jvm_memory_used_bytes{area="heap"} / 1048576 · jvm_memory_max_bytes{area="heap"} / 1048576'}
        >
          <TimeSeriesChart
            series={jvm.heap.series}
            formatar={(v) => `${formatNumber(v)} MB`}
            cores={{ usado: COLOR.roxo }}
            rotulos={{ usado: 'Utilizada' }}
            referenciaY={
              jvm.heap.maximoMb ? { valor: jvm.heap.maximoMb, rotulo: `Máximo · ${formatNumber(jvm.heap.maximoMb)} MB` } : undefined
            }
          />
        </Card>

        <Card
          titulo="7. Uso de CPU"
          subtitulo={`% · processo ${formatPct(jvm.cpu.processoPct, 0)} · sistema ${formatPct(jvm.cpu.sistemaPct, 0)}`}
          formula="100 * process_cpu_usage · 100 * system_cpu_usage"
        >
          <TimeSeriesChart
            series={jvm.cpu.series}
            formatar={(v) => formatPct(v, 0)}
            cores={{ processo: COLOR.roxo, sistema: COLOR.azul }}
            rotulos={{ processo: 'Processo', sistema: 'Sistema' }}
          />
        </Card>

        <Card
          titulo="8. Pausas de garbage collection"
          subtitulo={`s/s · pausa acumulada por segundo · atual ${formatCompact(jvm.gc.pausaSegundosPorSegundo)} s/s`}
          formula={`rate(jvm_gc_pause_seconds_sum[${rate}])`}
        >
          <TimeSeriesChart series={jvm.gc.series} formatar={formatCompact} cores={{ gc: COLOR.lilas }} rotulos={{ gc: 'GC' }} />
        </Card>

        <Card
          titulo="9. Threads ativas"
          subtitulo={`threads · atual ${formatNumber(jvm.threads.atuais)}`}
          formula="jvm_threads_live_threads"
        >
          <TimeSeriesChart
            series={jvm.threads.series}
            formatar={(v) => formatNumber(v)}
            cores={{ threads: COLOR.roxo }}
            rotulos={{ threads: 'Threads vivas' }}
          />
        </Card>

        <Card
          titulo="10. Uptime do processo"
          subtitulo={
            jvm.uptime.iniciadoEm
              ? `minutos desde a inicialização · início às ${new Date(jvm.uptime.iniciadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · atual ${formatNumber(jvm.uptime.minutos)} min`
              : 'minutos desde a inicialização'
          }
          formula="process_uptime_seconds / 60 · queda para zero sinaliza reinício do processo"
          inteiro
        >
          <TimeSeriesChart
            series={jvm.uptime.series}
            formatar={(v) => `${formatNumber(v)} min`}
            cores={{ uptime: COLOR.roxo }}
            rotulos={{ uptime: 'Uptime' }}
            marcasX={jvm.uptime.reinicios.map((t) => ({ t, rotulo: 'Reinício' }))}
            altura="baixo"
          />
        </Card>
      </Section>

      <Section
        numero="03"
        titulo="Banco de dados e logs"
        descricao={`2 visões · ${banco.tipo === 'mongodb' ? 'pool do MongoDB' : 'Hikari / Postgres Neon'} e Logback`}
      >
        <Card
          titulo={banco.tipo === 'mongodb' ? '11. Pool de conexões · MongoDB' : '11. Pool Hikari · Postgres Neon'}
          subtitulo={
            banco.disponivel
              ? `conexões ativas e pendentes · capacidade ${formatNumber(banco.capacidade)}`
              : 'o serviço não expõe pool de banco'
          }
          formula={
            banco.tipo === 'mongodb'
              ? 'mongodb_driver_pool_checkedout · mongodb_driver_pool_waitqueuesize · mongodb_driver_pool_size'
              : 'hikaricp_connections_active · hikaricp_connections_pending · increase(hikaricp_connections_timeout_total)'
          }
        >
          {banco.disponivel ? (
            <>
              <TimeSeriesChart
                series={banco.series}
                formatar={(v) => formatNumber(v, 1)}
                cores={{ ativas: COLOR.roxo, pendentes: COLOR.laranja }}
                rotulos={{ ativas: 'Ativas', pendentes: 'Pendentes' }}
                referenciaY={banco.capacidade ? { valor: banco.capacidade, rotulo: 'Capacidade', cor: COLOR.cinza } : undefined}
              />
              {banco.timeoutsNaJanela !== null && (
                <p className="rotulo-pequeno" style={{ marginTop: 8, color: banco.timeoutsNaJanela > 0 ? '#d1516b' : '#2e9e6b' }}>
                  Timeouts no período: {formatNumber(banco.timeoutsNaJanela)}
                </p>
              )}
            </>
          ) : (
            <Empty>Sem pool de banco neste serviço.</Empty>
          )}
        </Card>

        <Card
          titulo="12. Erros de log"
          subtitulo={`eventos/s · nível ERROR · atual ${formatCompact(logs.errosPorSegundo)} · ${formatNumber(logs.errosNaJanela)} na janela`}
          formula={`rate(logback_events_total{level="error"}[${rate}]) · não confundir com erros HTTP`}
        >
          <TimeSeriesChart
            series={logs.series}
            formatar={formatCompact}
            cores={{ error: COLOR.vermelho }}
            rotulos={{ error: 'ERROR' }}
            vazio="O serviço não expõe eventos do Logback."
          />
        </Card>
      </Section>

      <p className="rodape">
        Histórico guardado em memória pelo próprio serviço ({formatNumber(data.janela.amostras)} amostras de{' '}
        {data.janela.passoSegundos} s). Reiniciar o processo zera o histórico.
      </p>
    </>
  )
}
