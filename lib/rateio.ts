import { receitaNoMes } from './calendario'
import { competenciaDe } from './competencia'
import type { Categoria, Lancamento, Repasse } from './tipos'

export type Rateio = {
  entradasCentavos: number
  /** Só gastos operacionais: categorias marcadas como `entraNoRateio`. */
  gastosCentavos: number
  liquidoCentavos: number
  suaParteCentavos: number
  parteDoSocioCentavos: number
  /** Quanto já foi repassado ao sócio neste mês. */
  repassadoCentavos: number
  /** Quanto ainda falta repassar. Negativo significa que você adiantou. */
  aRepassarCentavos: number
}

/**
 * Divide o resultado do mês entre você e o sócio.
 *
 * Repasse tem tabela própria, separada de entradas e saídas, por dois motivos.
 * O primeiro é conceitual: mandar o Pix ao sócio não é custo de operar o
 * studio, é acerto da parte dele. O segundo é aritmético: se o repasse
 * contasse como gasto, pagar o sócio diminuiria o líquido, que diminuiria o
 * quanto se deve a ele, que mudaria de novo o valor a pagar — a conta nunca
 * fecharia.
 */
export function calcularRateio(
  lancamentos: Lancamento[],
  categorias: Categoria[],
  repasses: Repasse[],
  competencia: string,
  percentualSeu: number,
): Rateio {
  const foraDoRateio = new Set(
    categorias.filter((c) => !c.entraNoRateio).map((c) => c.id),
  )

  let entradasCentavos = 0
  let gastosCentavos = 0

  for (const l of lancamentos) {
    if (l.tipo === 'entrada') {
      entradasCentavos += receitaNoMes(l, competencia)
      continue
    }
    if (competenciaDe(l.data) !== competencia) continue

    // Categoria marcada como fora do rateio fica de fora da conta inteira.
    // Categoria que sumiu do cadastro conta como gasto operacional: é o
    // palpite conservador, porque erra para menos no que se deve ao sócio.
    if (l.categoriaId === null || !foraDoRateio.has(l.categoriaId)) {
      gastosCentavos += l.valorCentavos
    }
  }

  const repassadoCentavos = repasses
    .filter((r) => competenciaDe(r.data) === competencia)
    .reduce((total, r) => total + r.valorCentavos, 0)

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
