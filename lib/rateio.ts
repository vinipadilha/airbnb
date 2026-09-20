import { receitaNoMes } from './calendario'
import { competenciaDe } from './competencia'
import type { Categoria, Lancamento } from './tipos'

export type Rateio = {
  entradasCentavos: number
  /** Só gastos operacionais: categorias marcadas como `entraNoRateio`. */
  gastosCentavos: number
  liquidoCentavos: number
  suaParteCentavos: number
  parteDoSocioCentavos: number
  /** Quanto já saiu em repasses neste mês. */
  repassadoCentavos: number
  /** Quanto ainda falta repassar. Negativo significa que você adiantou. */
  aRepassarCentavos: number
}

/**
 * Divide o resultado do mês entre você e o sócio.
 *
 * O repasse ao sócio **não** entra como gasto operacional: se entrasse, pagar
 * o sócio diminuiria o líquido, que diminuiria o quanto se deve ao sócio, que
 * mudaria de novo o quanto pagar — a conta nunca fecharia. Por isso a
 * categoria de repasse é marcada com `entraNoRateio = false`, e o que se paga
 * por ela é abatido da dívida, não do resultado.
 */
export function calcularRateio(
  lancamentos: Lancamento[],
  categorias: Categoria[],
  competencia: string,
  percentualSeu: number,
): Rateio {
  const foraDoRateio = new Set(
    categorias.filter((c) => !c.entraNoRateio).map((c) => c.id),
  )

  let entradasCentavos = 0
  let gastosCentavos = 0
  let repassadoCentavos = 0

  for (const l of lancamentos) {
    if (l.tipo === 'entrada') {
      entradasCentavos += receitaNoMes(l, competencia)
      continue
    }
    if (competenciaDe(l.data) !== competencia) continue

    // Categoria que sumiu do cadastro conta como gasto operacional: é o
    // palpite conservador, porque erra para menos no que se deve ao sócio.
    if (l.categoriaId !== null && foraDoRateio.has(l.categoriaId)) {
      repassadoCentavos += l.valorCentavos
    } else {
      gastosCentavos += l.valorCentavos
    }
  }

  const liquidoCentavos = entradasCentavos - gastosCentavos

  // Arredonda só a sua parte e deriva a do sócio por subtração: assim as duas
  // somam exatamente o líquido, sem centavo órfão.
  const suaParteCentavos = Math.round((liquidoCentavos * percentualSeu) / 100)
  const parteDoSocioCentavos = liquidoCentavos - suaParteCentavos

  return {
    entradasCentavos,
    gastosCentavos,
    liquidoCentavos,
    suaParteCentavos,
    parteDoSocioCentavos,
    repassadoCentavos,
    aRepassarCentavos: parteDoSocioCentavos - repassadoCentavos,
  }
}
