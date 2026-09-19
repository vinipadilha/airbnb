const CODIFICADOR = new TextEncoder()

/** Duração da sessão: 180 dias. Você digita o PIN uma vez por aparelho. */
export const DURACAO_SESSAO_MS = 180 * 24 * 60 * 60 * 1000

export const COOKIE_SESSAO = 'studio_sessao'

async function importarChave(segredo: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    CODIFICADOR.encode(segredo),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

function paraBase64Url(bytes: ArrayBuffer): string {
  let binario = ''
  for (const byte of new Uint8Array(bytes)) binario += String.fromCharCode(byte)
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function assinar(payload: string, segredo: string): Promise<string> {
  const chave = await importarChave(segredo)
  const bytes = await crypto.subtle.sign('HMAC', chave, CODIFICADOR.encode(payload))
  return paraBase64Url(bytes)
}

/** Comparação de tempo constante. Evita descobrir o segredo caractere a caractere. */
export function comparaSegura(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diferenca = 0
  for (let i = 0; i < a.length; i++) {
    diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diferenca === 0
}

/**
 * Token de sessão: a data de expiração, mais um HMAC dela.
 * Guardar só uma flag (`auth=1`) seria inútil — qualquer visitante definiria o
 * cookie no próprio navegador e o middleware deixaria passar.
 */
export async function assinarToken(expiraEm: number, segredo: string): Promise<string> {
  const payload = String(expiraEm)
  return `${payload}.${await assinar(payload, segredo)}`
}

export async function verificarToken(
  token: string,
  segredo: string,
  agora: number = Date.now(),
): Promise<boolean> {
  const partes = token.split('.')
  if (partes.length !== 2) return false

  const [payload, assinatura] = partes
  if (!/^\d+$/.test(payload)) return false

  const esperada = await assinar(payload, segredo)
  if (!comparaSegura(assinatura, esperada)) return false

  return agora < Number(payload)
}
