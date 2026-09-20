import { receitaNoMes } from './calendario'
import { competenciaDe } from './competencia'
import type { Lancamento } from './tipos'

export type TotaisMes = {
  entradas: number
  saidas: number
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
  let saidas = 0

  for (const l of lancamentos) {
    if (l.tipo === 'entrada') {
      entradas += receitaNoMes(l, competencia)
    } else if (competenciaDe(l.data) === competencia) {
      saidas += l.valorCentavos
    }
  }
  return { entradas, saidas, saldo: entradas - saidas }
}

export function saldoAcumulado(lancamentos: Lancamento[]): number {
  return lancamentos.reduce(
    (total, l) => (l.tipo === 'entrada' ? total + l.valorCentavos : total - l.valorCentavos),
    0,
  )
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
