import { useState } from 'react'
import { fetchIaDashboard, fetchIaReport, fetchLangsmith } from '../api/services'
import type { IaDashboard, IaReport, LangsmithSection } from '../api/types'
import { BarsChart, CategoryLineChart } from '../components/charts/Charts'
import { COLOR } from '../components/charts/data'
import { PrinterIcon } from '../components/icons'
import { PageHeader } from '../components/PageHeader'
import { Card, DataTable, Empty, ErrorBanner, Kpi, PageSkeleton, Section, Skeleton } from '../components/ui'
import { IA_WINDOWS, type ServiceConfig } from '../config'
import { useAdminQuery } from '../hooks/useAdminQuery'
import {
  formatChange,
  formatDay,
  formatNumber,
  formatPct,
  formatPeriod,
  formatSeconds,
  formatTime,
  formatTokens,
  formatUsd,
  humanize,
} from '../utils/format'
import { custoPorDia, etapasPorRota, etapasPresentes, tokensPorDia } from './iaData'

const NOMES_INDICADOR: Record<string, string> = {
  volume: 'Volume total',
  latencia_p95_e2e_s: 'Latência p95 E2E',
  custo_usd: 'Custo total',
  taxa_erro_pct: 'Taxa de erro',
  devolucoes_juiz_pct: 'Devoluções do juiz',
}

function valorIndicador(indicador: string, valor: number): string {
  switch (indicador) {
    case 'volume':
      return formatNumber(valor)
    case 'latencia_p95_e2e_s':
      return formatSeconds(valor)
    case 'custo_usd':
      return formatUsd(valor)
    default:
      return formatPct(valor)
  }
}

export function IaServicePage({ service }: { service: ServiceConfig }) {
  const [dias, setDias] = useState(7)
  const [relatorioPedido, setRelatorioPedido] = useState(0)

  const painel = useAdminQuery((key, signal) => fetchIaDashboard(service, key, dias, signal), [service.id, dias])
  const langsmith = useAdminQuery((key, signal) => fetchLangsmith(service, key, dias, signal), [service.id, dias])
  const relatorio = useAdminQuery(
    (key, signal) => fetchIaReport(service, key, dias, signal),
    [service.id, dias, relatorioPedido],
    { enabled: relatorioPedido > 0 },
  )

  const seletor = (
    <select className="seletor" value={dias} onChange={(e) => setDias(Number(e.target.value))} aria-label="Período">
      {IA_WINDOWS.map((janela) => (
        <option key={janela.dias} value={janela.dias}>
          {janela.label}
        </option>
      ))}
    </select>
  )

  const botaoRelatorio = (
    <button
      type="button"
      className="botao"
      onClick={() => setRelatorioPedido((n) => n + 1)}
      disabled={relatorio.loading && relatorioPedido > 0}
    >
      {relatorio.loading && relatorioPedido > 0 ? 'Gerando…' : 'Gerar relatório do período'}
    </button>
  )

  const recarregar = () => {
    painel.reload()
    langsmith.reload()
  }

  return (
    <>
      <PageHeader
        titulo={service.label}
        subtitulo="Observabilidade do grafo de agentes · Mongo para a página, LangSmith para a seção 04"
        chips={[
          `application="${service.application}"`,
          painel.data ? `Período: ${formatPeriod(painel.data.janela.inicio, painel.data.janela.fim)}` : 'Período: carregando',
        ]}
        acoes={
          <>
            {seletor}
            {botaoRelatorio}
          </>
        }
        carregando={painel.loading}
        atualizadoEm={painel.updatedAt}
        onRefresh={recarregar}
      />

      {painel.error && (
        <ErrorBanner titulo={`Não foi possível carregar ${service.label}`} mensagem={painel.error.message} onRetry={painel.reload} />
      )}

      {!painel.data && painel.loading && <PageSkeleton />}

      {painel.data && <IaDashboardView painel={painel.data} provedor={service.provider ?? 'provedor'} />}

      {painel.data && (
        <LangsmithView
          estado={langsmith.data}
          erro={langsmith.error}
          carregando={langsmith.loading}
          onRetry={langsmith.reload}
        />
      )}

      {relatorioPedido > 0 && (
        <ReportView
          relatorio={relatorio.data}
          erro={relatorio.error}
          carregando={relatorio.loading}
          servico={service.label}
          onRetry={relatorio.reload}
        />
      )}
    </>
  )
}

function IaDashboardView({ painel, provedor }: { painel: IaDashboard; provedor: string }) {
  const { resumo, desempenho, leitura_nota: nota, custo, qualidade } = painel
  const tokens = tokensPorDia(painel)
  const custos = custoPorDia(painel)
  const etapas = etapasPresentes(painel)
  const limite = custo.tokens.limite_diario

  return (
    <>
      <article className="cartao">
        <h3 className="cartao__titulo">Resumo do período</h3>
        <p className="cartao__subtitulo">
          {formatPeriod(painel.janela.inicio, painel.janela.fim)} · {formatNumber(resumo.execucoes)} execuções · mesma base dos
          gráficos e do relatório
        </p>
        <div className="kpis">
          <Kpi valor={formatNumber(resumo.execucoes)} rotulo="Execuções" />
          <Kpi valor={formatSeconds(resumo.p95_e2e_s)} rotulo="p95 E2E" />
          <Kpi valor={formatUsd(resumo.custo_usd)} rotulo="Custo total" />
          <Kpi valor={formatPct(resumo.taxa_erro_pct)} rotulo="Taxa de erro" alerta={resumo.taxa_erro_pct >= 5} />
          <Kpi valor={formatPct(resumo.devolucoes_juiz_pct)} rotulo="Devoluções do juiz" />
        </div>
      </article>

      <Section numero="01" titulo="Performance" descricao="Latência por rota, decomposição por nó e leitura de nota">
        <Card titulo="Latência E2E por rota" subtitulo="segundos · p50 e p95 em séries distintas" formula="metrics · duration_ms por rota">
          <BarsChart
            linhas={desempenho.latencia_por_rota.map((linha) => ({ rota: linha.rota, p50: linha.p50_s, p95: linha.p95_s }))}
            categoria="rota"
            chaves={[
              { chave: 'p50', nome: 'p50', cor: COLOR.lilasClaro },
              { chave: 'p95', nome: 'p95', cor: COLOR.roxo },
            ]}
            formatar={(v) => formatSeconds(v)}
          />
          <p className="cartao__formula">
            Volume por rota: {desempenho.latencia_por_rota.map((l) => `${l.rota} ${formatNumber(l.execucoes)}`).join(' · ') || '—'}
          </p>
        </Card>

        <Card
          titulo="Latência média por nó · empilhada"
          subtitulo="segundos · contribuição de cada etapa por rota"
          formula="Soma das etapas = média E2E da rota, não soma de percentis"
        >
          <BarsChart
            linhas={etapasPorRota(painel)}
            categoria="rota"
            chaves={etapas.map((etapa) => ({ ...etapa, pilha: 'etapas' }))}
            formatar={(v) => formatSeconds(v)}
          />
        </Card>

        {nota && (
          <Card titulo="Leitura de nota" subtitulo={`Unidades separadas · ${formatNumber(nota.leituras)} leituras no período`} inteiro>
            <div className="kpis">
              <Kpi valor={formatNumber(nota.leituras)} rotulo="Leituras · contagem" />
              <Kpi valor={formatSeconds(nota.tempo_medio_s)} rotulo="Tempo médio por leitura" />
              <Kpi valor={formatSeconds(nota.p95_s)} rotulo="p95 por leitura" />
              <Kpi
                valor={formatPct(nota.taxa_sucesso_pct)}
                rotulo={`Sucesso · ${formatNumber(nota.sucesso)} de ${formatNumber(nota.leituras)}`}
                alerta={nota.leituras > 0 && nota.taxa_sucesso_pct < 90}
              />
            </div>
          </Card>
        )}
      </Section>

      <Section numero="02" titulo="Custo e capacidade" descricao={`Tokens por dia e rota, custo por modelo e limites do ${provedor}`}>
        <Card
          titulo="Tokens de entrada + saída por dia e rota"
          subtitulo={`mil tokens · ${formatTokens(custo.tokens.total_entrada + custo.tokens.total_saida)} no período · ${formatTokens(custo.tokens.total_entrada)} input + ${formatTokens(custo.tokens.total_saida)} output`}
          formula={
            custo.tokens.pico
              ? `Pico: ${formatDay(custo.tokens.pico.dia)} · ${formatTokens(custo.tokens.pico.total)}${custo.tokens.pico.pct_do_limite != null ? ` · ${formatPct(custo.tokens.pico.pct_do_limite)} do limite` : ''}`
              : undefined
          }
          inteiro
        >
          <BarsChart
            linhas={tokens.linhas}
            categoria="dia"
            chaves={tokens.chaves}
            formatar={(v) => formatTokens(v)}
            formatarCategoria={formatDay}
            referenciaY={limite ? { valor: limite, rotulo: `${provedor} · limite ${formatTokens(limite)}/dia` } : undefined}
            altura="alto"
          />
        </Card>

        <Card
          titulo="Custo diário por modelo"
          subtitulo={`USD · total ${formatUsd(custo.custo.total_usd)} · preços estimados`}
          formula={Object.entries(custo.custo.por_modelo)
            .map(([modelo, valor]) => `${modelo} ${formatUsd(valor)}`)
            .join(' · ')}
        >
          <BarsChart
            linhas={custos.linhas}
            categoria="dia"
            chaves={custos.chaves}
            formatar={(v) => formatUsd(v, 3)}
            formatarCategoria={formatDay}
          />
        </Card>

        <Card
          titulo={`${provedor} 429 · erros por hora`}
          subtitulo={`últimas 24 h · total ${formatNumber(custo.erros_de_cota.total_24h)} · período ${formatNumber(custo.erros_de_cota.total_janela)}`}
          formula="Conta o 429 que chegou ao fim da requisição. O que o retry absorveu vira latência."
        >
          <BarsChart
            linhas={custo.erros_de_cota.por_hora.map((linha) => ({ hora: linha.hora, quantidade: linha.quantidade }))}
            categoria="hora"
            chaves={[{ chave: 'quantidade', nome: '429 por hora', cor: COLOR.laranja }]}
            formatar={(v) => formatNumber(v)}
            formatarCategoria={formatTime}
            vazio="Nenhum 429 nas últimas 24 horas."
          />
        </Card>
      </Section>

      <Section numero="03" titulo="Qualidade e ferramentas" descricao="Decisões do juiz, bloqueios de guardrails e confiabilidade das tools">
        <Card
          titulo="Decisões do juiz"
          subtitulo={`${formatNumber(qualidade.juiz.total)} decisões · uma por leitura do juiz`}
          formula={`${formatNumber(qualidade.juiz.aprovado.quantidade)} (${formatPct(qualidade.juiz.aprovado.pct, 0)}) aprovadas · ${formatNumber(qualidade.juiz.devolvido.quantidade)} (${formatPct(qualidade.juiz.devolvido.pct, 0)}) devolvidas · ${formatNumber(qualidade.juiz.revertido.quantidade)} (${formatPct(qualidade.juiz.revertido.pct, 0)}) revertidas pela segunda opinião`}
        >
          <BarsChart
            linhas={[
              { decisao: 'Aprovadas', quantidade: qualidade.juiz.aprovado.quantidade },
              { decisao: 'Devolvidas', quantidade: qualidade.juiz.devolvido.quantidade },
              { decisao: 'Revertidas', quantidade: qualidade.juiz.revertido.quantidade },
            ]}
            categoria="decisao"
            chaves={[{ chave: 'quantidade', nome: 'Decisões', cor: COLOR.roxo }]}
            coresPorBarra={[COLOR.roxo, COLOR.lilas, COLOR.lilasClaro]}
            formatar={(v) => formatNumber(v)}
            vazio="O juiz não avaliou nenhuma resposta no período."
          />
        </Card>

        <Card
          titulo="Bloqueios de guardrails"
          subtitulo={`contagem por estágio · ${formatNumber(qualidade.guardrails.total)} bloqueios no período`}
          formula={`${formatPct(qualidade.guardrails.pct)} de ${formatNumber(qualidade.guardrails.execucoes)} execuções; não são erros de tool`}
        >
          <BarsChart
            linhas={[
              { estagio: 'Entrada', quantidade: qualidade.guardrails.entrada },
              { estagio: 'Saída', quantidade: qualidade.guardrails.saida },
            ]}
            categoria="estagio"
            chaves={[{ chave: 'quantidade', nome: 'Bloqueios', cor: COLOR.vermelho }]}
            formatar={(v) => formatNumber(v)}
            vazio="Nenhum bloqueio no período."
          />
        </Card>

        <Card titulo="Ferramentas · chamadas, erros e duração média" subtitulo="Mesmos nomes do relatório" inteiro>
          <DataTable
            vazio="Nenhuma chamada de tool no período."
            linhas={qualidade.ferramentas}
            colunas={[
              { titulo: 'Tool', valor: (linha) => <span className="mono">{linha.tool}</span> },
              { titulo: 'Chamadas', valor: (linha) => formatNumber(linha.chamadas), numero: true },
              { titulo: 'Erros', valor: (linha) => formatNumber(linha.erros), numero: true },
              { titulo: 'Taxa de erro', valor: (linha) => formatPct(linha.taxa_erro_pct), numero: true },
              { titulo: 'Média (ms)', valor: (linha) => formatNumber(linha.media_ms), numero: true },
              { titulo: 'p95 (ms)', valor: (linha) => formatNumber(linha.p95_ms), numero: true },
            ]}
          />
        </Card>
      </Section>
    </>
  )
}

function LangsmithView({
  estado,
  erro,
  carregando,
  onRetry,
}: {
  estado: LangsmithSection | null
  erro: Error | null
  carregando: boolean
  onRetry: () => void
}) {
  return (
    <Section numero="04" titulo="LangSmith" descricao="Execuções e erros por dia, percentis por chain e por agente">
      {!estado && carregando && (
        <>
          <article className="cartao cartao--inteiro">
            <div className="carregando-ls">Consultando o LangSmith… a API é paginada e pode levar alguns segundos.</div>
          </article>
          <Skeleton altura={280} />
          <Skeleton altura={280} />
        </>
      )}

      {erro && (
        <div className="cartao--inteiro">
          <ErrorBanner titulo="LangSmith indisponível" mensagem={erro.message} onRetry={onRetry} />
        </div>
      )}

      {estado && !estado.disponivel && (
        <article className="cartao cartao--inteiro">
          <h3 className="cartao__titulo">LangSmith indisponível</h3>
          <p className="cartao__subtitulo">{estado.motivo ?? 'Sem chave, tracing desligado ou API fora do ar.'}</p>
        </article>
      )}

      {estado && estado.disponivel && (
        <>
          <Card
            titulo="Execuções por dia"
            subtitulo={`runs raiz · total ${formatNumber(estado.porDia.reduce((s, d) => s + d.execucoes, 0))}${estado.projeto ? ` · projeto ${estado.projeto}` : ''}`}
            formula={estado.porDia.map((d) => formatNumber(d.execucoes)).join(' / ')}
          >
            <BarsChart
              linhas={estado.porDia.map((d) => ({ dia: d.dia, execucoes: d.execucoes }))}
              categoria="dia"
              chaves={[{ chave: 'execucoes', nome: 'Runs', cor: COLOR.roxo }]}
              formatar={(v) => formatNumber(v)}
              formatarCategoria={formatDay}
            />
          </Card>

          <Card
            titulo="Taxa de erro por dia"
            subtitulo={`% · erros sobre runs raiz · ${formatNumber(estado.porDia.reduce((s, d) => s + d.erros, 0))} erros no período`}
            formula={estado.porDia.map((d) => formatNumber(d.erros)).join(' / ')}
          >
            <CategoryLineChart
              linhas={estado.porDia.map((d) => ({ dia: d.dia, taxa: d.taxaErroPct }))}
              categoria="dia"
              chave="taxa"
              nome="Taxa de erro"
              cor={COLOR.vermelho}
              formatar={(v) => formatPct(v)}
              formatarCategoria={formatDay}
            />
          </Card>

          <Card titulo="Latência por chain" subtitulo="segundos · p50 / p99" formula={estado.chains.map((c) => c.nome).join(' · ')}>
            <BarsChart
              linhas={estado.chains.map((c) => ({ nome: humanize(c.nome), p50: c.p50, p99: c.p99 }))}
              categoria="nome"
              chaves={[
                { chave: 'p50', nome: 'p50', cor: COLOR.lilasClaro },
                { chave: 'p99', nome: 'p99', cor: COLOR.roxo },
              ]}
              formatar={(v) => formatSeconds(v)}
            />
          </Card>

          <Card titulo="Latência por agente" subtitulo="segundos · p50 / p99" formula={estado.agentes.map((a) => a.nome).join(' · ')}>
            <BarsChart
              linhas={estado.agentes.map((a) => ({ nome: humanize(a.nome), p50: a.p50, p99: a.p99 }))}
              categoria="nome"
              chaves={[
                { chave: 'p50', nome: 'p50', cor: COLOR.lilasClaro },
                { chave: 'p99', nome: 'p99', cor: COLOR.roxo },
              ]}
              formatar={(v) => formatSeconds(v)}
            />
          </Card>

          <Card titulo="Feedback dos usuários" subtitulo="Avaliações gravadas no LangSmith neste período" inteiro>
            {estado.feedback.total === 0 ? (
              <p className="cartao__subtitulo">
                Nenhuma avaliação registrada neste período. Sem notas ou comentários no LangSmith: estado vazio, não uma
                média zero.
              </p>
            ) : (
              <DataTable
                vazio="Sem avaliações."
                linhas={estado.feedback.porChave}
                colunas={[
                  { titulo: 'Chave', valor: (l) => l.chave },
                  { titulo: 'Avaliações', valor: (l) => formatNumber(l.avaliacoes), numero: true },
                  { titulo: 'Média', valor: (l) => formatNumber(l.media, 2), numero: true },
                ]}
              />
            )}
          </Card>
        </>
      )}
    </Section>
  )
}

function ReportView({
  relatorio,
  erro,
  carregando,
  servico,
  onRetry,
}: {
  relatorio: IaReport | null
  erro: Error | null
  carregando: boolean
  servico: string
  onRetry: () => void
}) {
  return (
    <Section numero="05" titulo="Relatório do período" descricao="Resumo visível · período atual contra o anterior de mesmo tamanho">
      {carregando && !relatorio && (
        <div className="cartao--inteiro">
          <Skeleton altura={320} />
        </div>
      )}

      {erro && (
        <div className="cartao--inteiro">
          <ErrorBanner titulo="Não foi possível gerar o relatório" mensagem={erro.message} onRetry={onRetry} />
        </div>
      )}

      {relatorio && (
        <article className="cartao cartao--inteiro">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <h3 className="cartao__titulo">Relatório · {servico}</h3>
              <p className="cartao__subtitulo">
                Atual {formatPeriod(relatorio.periodo_atual.inicio, relatorio.periodo_atual.fim)} contra{' '}
                {formatPeriod(relatorio.periodo_anterior.inicio, relatorio.periodo_anterior.fim)} · gerado às{' '}
                {formatTime(relatorio.gerado_em)}
              </p>
            </div>
            <button type="button" className="botao botao--secundario" onClick={() => window.print()}>
              <PrinterIcon size={16} />
              Imprimir
            </button>
          </div>

          <div className="cartao__corpo">
            <DataTable
              vazio="Sem indicadores."
              linhas={relatorio.indicadores}
              colunas={[
                { titulo: 'Indicador', valor: (l) => NOMES_INDICADOR[l.indicador] ?? humanize(l.indicador) },
                { titulo: 'Atual', valor: (l) => valorIndicador(l.indicador, l.atual), numero: true },
                { titulo: 'Anterior', valor: (l) => valorIndicador(l.indicador, l.anterior), numero: true },
                {
                  titulo: 'Variação',
                  numero: true,
                  valor: (l) => {
                    // Volume subir é bom; latência, custo, erro e devolução subirem é ruim.
                    const subirEhBom = l.indicador === 'volume'
                    const classe =
                      l.variacao == null || l.variacao === 0
                        ? ''
                        : (l.variacao > 0) === subirEhBom
                          ? 'variacao--boa'
                          : 'variacao--ruim'
                    return <span className={classe}>{formatChange(l.variacao, l.variacao_em === 'pontos')}</span>
                  },
                },
              ]}
            />
          </div>

          <div className="duas-colunas">
            <div>
              <div className="rotulo-pequeno">Top 3 rotas mais lentas · p95</div>
              {relatorio.rotas_mais_lentas.length ? (
                <ol className="lista-topo">
                  {relatorio.rotas_mais_lentas.map((r) => (
                    <li key={r.rota}>
                      {r.rota} · {formatSeconds(r.p95_s)}
                    </li>
                  ))}
                </ol>
              ) : (
                <Empty>Sem rotas no período.</Empty>
              )}
            </div>
            <div>
              <div className="rotulo-pequeno">Top 3 tools com maior taxa de erro</div>
              {relatorio.tools_com_mais_erro.length ? (
                <ol className="lista-topo">
                  {relatorio.tools_com_mais_erro.map((t) => (
                    <li key={t.tool}>
                      <span className="mono">{t.tool}</span> · {formatPct(t.taxa_erro_pct)} ({formatNumber(t.erros)}/
                      {formatNumber(t.chamadas)})
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="cartao__subtitulo" style={{ marginTop: 8 }}>
                  Nenhuma tool falhou no período.
                </p>
              )}
            </div>
          </div>

          <p className="rodape" style={{ marginTop: 18 }}>
            Consumo: {formatTokens(relatorio.consumo.tokens_entrada + relatorio.consumo.tokens_saida)} tokens (
            {formatTokens(relatorio.consumo.tokens_entrada)} input + {formatTokens(relatorio.consumo.tokens_saida)} output).
            {relatorio.consumo.pico_diario &&
              ` Pico diário ${formatTokens(relatorio.consumo.pico_diario.total)} em ${formatDay(relatorio.consumo.pico_diario.dia)}${relatorio.consumo.limite_diario ? ` de ${formatTokens(relatorio.consumo.limite_diario)}` : ''}.`}
            {relatorio.leitura_nota &&
              ` Leitura de nota: ${formatNumber(relatorio.leitura_nota.leituras)} leituras, ${formatPct(relatorio.leitura_nota.taxa_sucesso_pct)} de sucesso.`}{' '}
            Juiz: {formatNumber(relatorio.juiz.total)} decisões.
          </p>
        </article>
      )}
    </Section>
  )
}
