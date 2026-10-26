import { describe, expect, it } from 'vitest'
import { formatChange, formatCompact, formatDay, formatPct, formatTokens, formatUsd, humanize } from './format'

// toLocaleString usa espaço inseparável em alguns formatos: normaliza para comparar.
const limpo = (texto: string) => texto.replaceAll(String.fromCharCode(160), ' ')

describe('formatação', () => {
  it('nunca mostra NaN: valor ausente vira travessão', () => {
    expect(formatPct(null)).toBe('—')
    expect(formatCompact(Number.NaN)).toBe('—')
    expect(formatUsd(undefined)).toBe('—')
  })

  it('usa vírgula decimal do pt-BR', () => {
    expect(formatPct(1.2)).toBe('1,20%')
    expect(formatCompact(12.4)).toBe('12,4')
    expect(limpo(formatUsd(3.8))).toBe('US$ 3,80')
  })

  it('abrevia tokens em mil e milhão', () => {
    expect(formatTokens(950)).toBe('950')
    expect(formatTokens(150_000)).toBe('150 mil')
    expect(formatTokens(1_250_000)).toBe('1,25 mi')
  })

  it('variação leva sinal e unidade certa', () => {
    expect(formatChange(9.7, false)).toBe('+9,70%')
    expect(formatChange(-0.5, true)).toBe('-0,50 p.p.')
    expect(formatChange(null, false)).toBe('—')
  })

  it('dia sem hora não volta um dia por causa do fuso', () => {
    expect(formatDay('2026-10-14')).toBe('14 out')
  })

  it('humaniza nomes de nós', () => {
    expect(humanize('agente_estoque')).toBe('Agente estoque')
    expect(humanize('input_guardrail')).toBe('Input guardrail')
  })
})
