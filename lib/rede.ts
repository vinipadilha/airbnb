/**
 * GET que devolve o corpo já convertido, ou rejeita.
 *
 * Não toca em estado do React de propósito: quem chama decide o que fazer com
 * o resultado, num `.then`. É isso que permite buscar dados dentro de um
 * efeito sem disparar renderização em cascata.
 */
export async function buscarJson<T>(url: string): Promise<T> {
  const resposta = await fetch(url)
  if (!resposta.ok) throw new Error(`${url} respondeu ${resposta.status}`)
  return (await resposta.json()) as T
}
