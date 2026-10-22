/**
 * Conferência da chave pelo próprio painel, sem depender de nenhum serviço estar no ar.
 *
 * O painel guarda só o SHA-256 da chave (VITE_ADMIN_KEY_SHA256). Variável VITE_ vai embutida no
 * JavaScript que o navegador baixa: com a chave em texto puro, qualquer um que abrisse o painel
 * leria a chave no código. Com o hash, não dá para voltar à chave.
 *
 * Para gerar o hash de uma chave:
 *   node -e "console.log(require('crypto').createHash('sha256').update(process.argv[1]).digest('hex'))" "<chave>"
 */

export async function sha256Hex(texto: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Compara em tempo constante para não vazar, pelo tempo de resposta, quantos caracteres batem. */
function iguais(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  let diferenca = 0
  for (let i = 0; i < a.length; i++) {
    diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diferenca === 0
}

export async function matchesKeyHash(chave: string, hashEsperado: string): Promise<boolean> {
  const esperado = hashEsperado.trim().toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(esperado)) {
    return false
  }
  return iguais(await sha256Hex(chave.trim()), esperado)
}
