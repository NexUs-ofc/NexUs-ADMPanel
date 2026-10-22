import { describe, expect, it } from 'vitest'
import { matchesKeyHash, sha256Hex } from './keyHash'

// sha256("chave-de-teste")
const HASH = 'a9d1d2a3e53b5b5c7c0e1ef2d1b9b5c5b8d2a3f1c0e9d8c7b6a5f4e3d2c1b0a9'

describe('conferência da chave pelo hash', () => {
  it('aceita a chave cujo hash bate, ignorando espaços nas pontas', async () => {
    const hash = await sha256Hex('chave-de-teste')

    expect(await matchesKeyHash('chave-de-teste', hash)).toBe(true)
    expect(await matchesKeyHash('  chave-de-teste  ', hash.toUpperCase())).toBe(true)
  })

  it('recusa chave diferente', async () => {
    const hash = await sha256Hex('chave-de-teste')

    expect(await matchesKeyHash('outra-chave', hash)).toBe(false)
  })

  it('recusa quando o hash configurado não tem formato de SHA-256', async () => {
    expect(await matchesKeyHash('chave-de-teste', 'chave-de-teste')).toBe(false)
    expect(await matchesKeyHash('chave-de-teste', '')).toBe(false)
    expect(await matchesKeyHash('chave-de-teste', HASH)).toBe(false)
  })

  it('gera o mesmo hash que o comando do Node indicado na documentação', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })
})
