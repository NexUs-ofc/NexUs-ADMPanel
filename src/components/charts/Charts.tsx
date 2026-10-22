import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Serie } from '../../api/types'
import { formatCompact, formatTime } from '../../utils/format'
import { Empty } from '../ui'
import { colorAt, hasData, toRows } from './data'

const EIXO = { fontSize: 10, fill: '#9a94ab' }
const GRADE = '#efecf6'
const DICA = {
  contentStyle: { borderRadius: 10, border: '1px solid #e7e2f1', fontSize: 12, fontFamily: 'Montserrat' },
  labelStyle: { fontWeight: 700, color: '#5a2789' },
}

export interface LegendItem {
  nome: string
  cor: string
}

export function Legend({ itens }: { itens: LegendItem[] }) {
  return (
    <div className="legenda">
      {itens.map((item) => (
        <span key={item.nome} className="legenda__item">
          <span className="legenda__cor" style={{ background: item.cor }} />
          {item.nome}
        </span>
      ))}
    </div>
  )
}

/**
 * Séries no tempo (as visões do Micrometer). Cada série ganha uma cor; nomes em cores define a cor
 * de uma série específica. referenciaY desenha um limite (heap máximo, capacidade do pool), e
 * marcasX desenha linhas verticais (reinícios do processo).
 */
export function TimeSeriesChart({
  series,
  formatar = formatCompact,
  cores = {},
  rotulos = {},
  referenciaY,
  marcasX = [],
  altura = 'normal',
  vazio = 'Sem dados na janela.',
}: {
  series: Serie[]
  formatar?: (valor: number) => string
  cores?: Record<string, string>
  rotulos?: Record<string, string>
  referenciaY?: { valor: number; rotulo: string; cor?: string }
  marcasX?: { t: string; rotulo: string }[]
  altura?: 'baixo' | 'normal' | 'alto'
  vazio?: string
}) {
  if (!hasData(series)) {
    return <Empty>{vazio}</Empty>
  }
  const linhas = toRows(series)
  const corDe = (nome: string, i: number) => cores[nome] ?? colorAt(i)

  return (
    <>
      <div className={`grafico${altura === 'normal' ? '' : ` grafico--${altura}`}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={linhas} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
            <CartesianGrid stroke={GRADE} vertical={false} />
            <XAxis dataKey="t" tickFormatter={formatTime} tick={EIXO} axisLine={false} tickLine={false} minTickGap={36} />
            <YAxis tick={EIXO} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatar(v)} width={56} />
            <Tooltip
              {...DICA}
              labelFormatter={(t) => formatTime(String(t))}
              formatter={(valor, nome) => [formatar(Number(valor)), rotulos[String(nome)] ?? String(nome)]}
            />
            {referenciaY && (
              <ReferenceLine
                y={referenciaY.valor}
                stroke={referenciaY.cor ?? '#d1516b'}
                strokeDasharray="5 4"
                ifOverflow="extendDomain"
                label={{ value: referenciaY.rotulo, position: 'insideTopLeft', fontSize: 10, fill: referenciaY.cor ?? '#d1516b' }}
              />
            )}
            {marcasX.map((marca) => (
              <ReferenceLine
                key={marca.t}
                x={marca.t}
                stroke="#d9922e"
                strokeDasharray="4 4"
                label={{ value: marca.rotulo, position: 'insideTopRight', fontSize: 10, fill: '#d9922e' }}
              />
            ))}
            {series.map((serie, i) => (
              <Line
                key={serie.nome}
                type="monotone"
                dataKey={serie.nome}
                stroke={corDe(serie.nome, i)}
                strokeWidth={1.8}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <Legend itens={series.map((serie, i) => ({ nome: rotulos[serie.nome] ?? serie.nome, cor: corDe(serie.nome, i) }))} />
    </>
  )
}

export interface BarKey {
  chave: string
  nome: string
  cor: string
  /** Barras com o mesmo grupo empilham; sem grupo, ficam lado a lado. */
  pilha?: string
}

/** Barras por categoria (rota, dia, decisão). */
export function BarsChart({
  linhas,
  categoria,
  chaves,
  formatar = formatCompact,
  formatarCategoria = (v: string) => v,
  referenciaY,
  altura = 'normal',
  vazio = 'Sem dados no período.',
  coresPorBarra,
}: {
  linhas: Record<string, string | number | null>[]
  categoria: string
  chaves: BarKey[]
  formatar?: (valor: number) => string
  formatarCategoria?: (valor: string) => string
  referenciaY?: { valor: number; rotulo: string }
  altura?: 'baixo' | 'normal' | 'alto'
  vazio?: string
  /** Uma cor por barra (uma só série), na ordem das linhas. */
  coresPorBarra?: string[]
}) {
  const temDado = linhas.some((linha) => chaves.some((k) => Number(linha[k.chave] ?? 0) > 0))
  if (!temDado) {
    return <Empty>{vazio}</Empty>
  }

  return (
    <>
      <div className={`grafico${altura === 'normal' ? '' : ` grafico--${altura}`}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={linhas} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
            <CartesianGrid stroke={GRADE} vertical={false} />
            <XAxis
              dataKey={categoria}
              tick={EIXO}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => formatarCategoria(String(v))}
              interval={linhas.length > 12 ? 'preserveStartEnd' : 0}
              minTickGap={8}
            />
            <YAxis tick={EIXO} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatar(v)} width={56} />
            <Tooltip
              {...DICA}
              cursor={{ fill: '#f4f2fb' }}
              labelFormatter={(v) => formatarCategoria(String(v))}
              formatter={(valor, nome) => [formatar(Number(valor)), chaves.find((k) => k.chave === nome)?.nome ?? String(nome)]}
            />
            {referenciaY && (
              <ReferenceLine
                y={referenciaY.valor}
                stroke="#d1516b"
                strokeDasharray="5 4"
                ifOverflow="extendDomain"
                label={{ value: referenciaY.rotulo, position: 'insideTopLeft', fontSize: 10, fill: '#d1516b' }}
              />
            )}
            {chaves.map((k) => (
              <Bar
                key={k.chave}
                dataKey={k.chave}
                fill={k.cor}
                stackId={k.pilha}
                radius={k.pilha ? 0 : [3, 3, 0, 0]}
                maxBarSize={34}
                isAnimationActive={false}
              >
                {coresPorBarra && linhas.map((_, i) => <Cell key={i} fill={coresPorBarra[i % coresPorBarra.length]} />)}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {!coresPorBarra && <Legend itens={chaves.map((k) => ({ nome: k.nome, cor: k.cor }))} />}
    </>
  )
}

/** Linha sobre categorias (dias), para taxas que não são séries do Micrometer. */
export function CategoryLineChart({
  linhas,
  categoria,
  chave,
  nome,
  cor,
  formatar = formatCompact,
  formatarCategoria = (v: string) => v,
  vazio = 'Sem dados no período.',
}: {
  linhas: Record<string, string | number | null>[]
  categoria: string
  chave: string
  nome: string
  cor: string
  formatar?: (valor: number) => string
  formatarCategoria?: (valor: string) => string
  vazio?: string
}) {
  if (linhas.length === 0) {
    return <Empty>{vazio}</Empty>
  }
  return (
    <>
      <div className="grafico">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={linhas} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
            <CartesianGrid stroke={GRADE} vertical={false} />
            <XAxis dataKey={categoria} tick={EIXO} axisLine={false} tickLine={false} tickFormatter={(v) => formatarCategoria(String(v))} />
            <YAxis tick={EIXO} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatar(v)} width={56} />
            <Tooltip {...DICA} labelFormatter={(v) => formatarCategoria(String(v))} formatter={(valor) => [formatar(Number(valor)), nome]} />
            <Line type="monotone" dataKey={chave} stroke={cor} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <Legend itens={[{ nome, cor }]} />
    </>
  )
}

/** Pizza com legenda ao lado (distribuição de status). */
export function DonutChart({
  fatias,
  formatar,
  vazio = 'Sem requisições na janela.',
}: {
  fatias: { nome: string; valor: number; cor: string; detalhe?: string }[]
  formatar: (valor: number) => string
  vazio?: string
}) {
  const total = fatias.reduce((soma, f) => soma + f.valor, 0)
  if (total === 0) {
    return <Empty>{vazio}</Empty>
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
      <div style={{ width: 200, height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={fatias} dataKey="valor" nameKey="nome" innerRadius={0} outerRadius={92} stroke="#fff" strokeWidth={1} isAnimationActive={false}>
              {fatias.map((f) => (
                <Cell key={f.nome} fill={f.cor} />
              ))}
            </Pie>
            <Tooltip {...DICA} formatter={(valor, nome) => [formatar(Number(valor)), String(nome)]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="legenda" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, auto)', gap: '8px 18px' }}>
        {fatias.map((f) => (
          <span key={f.nome} className="legenda__item">
            <span className="legenda__cor" style={{ background: f.cor }} />
            {f.nome} · {f.detalhe ?? formatar(f.valor)}
          </span>
        ))}
      </div>
    </div>
  )
}
