import { describe, expect, it } from 'vitest'
import { hasData, toRows } from './data'

describe('toRows', () => {
  it('junta séries por instante e ordena no tempo', () => {
    const linhas = toRows([
      { nome: 'p50', pontos: [{ t: '2026-10-20T12:01:00Z', v: 2 }, { t: '2026-10-20T12:00:00Z', v: 1 }] },
      { nome: 'p95', pontos: [{ t: '2026-10-20T12:00:00Z', v: 5 }] },
    ])

    expect(linhas).toEqual([
      { t: '2026-10-20T12:00:00Z', p50: 1, p95: 5 },
      { t: '2026-10-20T12:01:00Z', p50: 2 },
    ])
  })

  it('série toda nula não conta como dado', () => {
    expect(hasData([{ nome: 'x', pontos: [{ t: 'a', v: null }] }])).toBe(false)
    expect(hasData([{ nome: 'x', pontos: [{ t: 'a', v: 0 }] }])).toBe(true)
  })
})
