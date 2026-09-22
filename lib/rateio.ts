import { competenciaDe } from './competencia'
import type { Categoria, Lancamento, Repasse } from './tipos'

export type Rateio = {
  entradasCentavos: number
  /** Só gastos operacionais: categorias marcadas como `entraNoRateio`. */
  gastosCentavos: number
  liquidoCentavos: number
  suaParteCentavos: number
  parteDoSocioCentavos: number
  /** Gastos do mês que o sócio pagou do bolso dele. */
  gastosPagosPeloSocioCentavos: number
  /** Quanto já foi repassado ao sócio neste mês. */
  repassadoCentavos: number
  /** Quanto ainda falta repassar. Negativo significa que você adiantou. */
  aRepassarCentavos: number
}

/**
 * Divide o resultado do mês entre você e o sócio, e calcula o acerto.
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
  let gastosPagosPeloSocioCentavos = 0

  for (const l of lancamentos) {
    if (competenciaDe(l.data) !== competencia) continue

    if (l.tipo === 'entrada') {
      // Só divide o que entrou de verdade: repassar sobre reserva programada
      // seria pagar o sócio com dinheiro que ainda não existe.
      if (l.recebido) entradasCentavos += l.valorCentavos
      continue
    }

    // Categoria marcada como fora do rateio fica de fora da conta inteira.
    // Categoria que sumiu do cadastro conta como gasto operacional: é o
    // palpite conservador, porque erra para menos no que se deve ao sócio.
    if (l.categoriaId === null || !foraDoRateio.has(l.categoriaId)) {
      gastosCentavos += l.valorCentavos
      // Quem pagou não muda o resultado do mês, só o acerto no fim.
      if (l.pagoPor === 'socio') gastosPagosPeloSocioCentavos += l.valorCentavos
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
    gastosPagosPeloSocioCentavos,
    repassadoCentavos,
    // O sócio recebe a parte dele MAIS o que adiantou do bolso: a receita
    // inteira caiu na sua conta, então o desembolso dele precisa voltar junto.
    // Sem isso ele arcaria sozinho com uma despesa que é dos dois.
    aRepassarCentavos:
      parteDoSocioCentavos + gastosPagosPeloSocioCentavos - repassadoCentavos,
  }
}
