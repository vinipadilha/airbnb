import { receitaNoMes } from './calendario'
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
 * Totais da competência.
 *
 * Entradas entram rateadas por noite: uma reserva de 244 noites pertence aos
 * nove meses que ela atravessa, não ao mês do check-in. Por isso a soma não
 * pode filtrar por `data` como as saídas fazem.
 */
export function totaisDoMes(lancamentos: Lancamento[], competencia: string): TotaisMes {
  let entradas = 0
  let entradasProgramadas = 0
  let saidas = 0

  for (const l of lancamentos) {
    if (l.tipo === 'entrada') {
      // Programado é previsão, não dinheiro: fica num balde à parte para não
      // inflar o saldo com reserva que o hóspede ainda pode cancelar.
      if (l.recebido) entradas += receitaNoMes(l, competencia)
      else entradasProgramadas += receitaNoMes(l, competencia)
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
