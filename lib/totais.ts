import { competenciaDe } from './competencia'
import type { Lancamento } from './tipos'

export type TotaisMes = {
  /** Só o que já caiu na conta. */
  entradas: number
  /** Reservas do mês que ainda não foram recebidas. */
  entradasProgramadas: number
  saidas: number
  /** entradas recebidas − saídas. Programado não entra. */
  saldo: number
}

export type TotalCategoria = {
  categoriaId: string | null
  totalCentavos: number
}

function doMes(lancamentos: Lancamento[], competencia: string): Lancamento[] {
  return lancamentos.filter((l) => competenciaDe(l.data) === competencia)
}

/**
 * Totais da competência, em regime de caixa.
 *
 * A receita da reserva pertence inteira ao mês da data registrada, mesmo que a
 * estadia atravesse a virada do mês: o Airbnb paga uma vez só, no dia seguinte
 * ao check-in. Ratear por noite espalharia o dinheiro por meses em que ele
 * nunca entrou, e aí nenhum mês bateria com o extrato do banco — que é contra
 * o que estes números são conferidos.
 */
export function totaisDoMes(lancamentos: Lancamento[], competencia: string): TotaisMes {
  let entradas = 0
  let entradasProgramadas = 0
  let saidas = 0

  for (const l of lancamentos) {
    if (l.tipo === 'entrada') {
      // Programado é previsão, não dinheiro: fica num balde à parte para não
      // inflar o saldo com reserva que o hóspede ainda pode cancelar.
      if (competenciaDe(l.data) !== competencia) continue
      if (l.recebido) entradas += l.valorCentavos
      else entradasProgramadas += l.valorCentavos
    } else if (competenciaDe(l.data) === competencia) {
      saidas += l.valorCentavos
    }
  }
  return { entradas, entradasProgramadas, saidas, saldo: entradas - saidas }
}

/** Saldo do histórico inteiro. Entrada programada não conta: não é dinheiro. */
export function saldoAcumulado(lancamentos: Lancamento[]): number {
  return lancamentos.reduce((total, l) => {
    if (l.tipo === 'saida') return total - l.valorCentavos
    return l.recebido ? total + l.valorCentavos : total
  }, 0)
}

export function saidasPorCategoria(
  lancamentos: Lancamento[],
  competencia: string,
): TotalCategoria[] {
  const porCategoria = new Map<string | null, number>()
  for (const l of doMes(lancamentos, competencia)) {
    if (l.tipo !== 'saida') continue
    const chave = l.categoriaId
    porCategoria.set(chave, (porCategoria.get(chave) ?? 0) + l.valorCentavos)
  }
  return [...porCategoria.entries()]
    .map(([categoriaId, totalCentavos]) => ({ categoriaId, totalCentavos }))
    .sort((a, b) => b.totalCentavos - a.totalCentavos)
}
