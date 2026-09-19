const FORMATADOR = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

/**
 * Converte texto digitado ou colado em centavos.
 * Aceita "1.234,56" (pt-BR) e "1234.56". Devolve null se não for um valor
 * monetário positivo válido.
 */
export function parseValorBRL(entrada: string): number | null {
  const limpo = entrada.replace(/R\$/gi, '').replace(/\s/g, '').trim()
  if (limpo === '') return null
  if (!/^-?[\d.,]+$/.test(limpo)) return null

  const temVirgula = limpo.includes(',')
  const temPonto = limpo.includes('.')

  let normalizado: string
  if (temVirgula) {
    // Vírgula é o decimal; ponto é separador de milhar.
    if (limpo.split(',').length > 2) return null
    normalizado = limpo.replace(/\./g, '').replace(',', '.')
  } else if (temPonto) {
    const partes = limpo.split('.')
    // "1.234" é milhar; "1234.56" é decimal. O desempate é o tamanho do último
    // grupo: exatamente 3 dígitos significa milhar.
    const ultimo = partes[partes.length - 1]
    normalizado =
      partes.length > 1 && ultimo.length === 3
        ? partes.join('')
        : partes.length > 2
          ? partes.slice(0, -1).join('') + '.' + ultimo
          : limpo
  } else {
    normalizado = limpo
  }

  const numero = Number(normalizado)
  if (!Number.isFinite(numero)) return null

  const centavos = Math.round(numero * 100)
  if (centavos <= 0) return null
  return centavos
}

/** Formata centavos como moeda pt-BR. */
export function formatCentavos(centavos: number): string {
  return FORMATADOR.format(centavos / 100)
}
