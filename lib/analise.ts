import { competenciaDe } from './competencia'
import type { Lancamento } from './tipos'

export type MesDoAno = {
  /** YYYY-MM */
  competencia: string
  /** 'jan', 'fev'… para o eixo do gráfico. */
  rotulo: string
  /** Entradas que já caíram na conta. */
  recebidoCentavos: number
  /** Reservas do mês ainda não recebidas. */
  programadoCentavos: number
  /** recebido + programado. É o que o Airbnb chama de total do mês. */
  totalCentavos: number
  saidasCentavos: number
  /** recebido − saídas. Programado não entra: não é dinheiro. */
  saldoCentavos: number
}

const ROTULOS = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
]

/**
 * Os doze meses do ano, sempre todos.
 *
 * Mês sem movimento vem zerado em vez de ausente: o gráfico precisa da barra
 * vazia no lugar certo, senão o eixo encolhe e a comparação entre meses mente.
 */
export function resumoAnual(lancamentos: Lancamento[], ano: number): MesDoAno[] {
  const meses: MesDoAno[] = ROTULOS.map((rotulo, i) => ({
    competencia: `${ano}-${String(i + 1).padStart(2, '0')}`,
    rotulo,
    recebidoCentavos: 0,
    programadoCentavos: 0,
    totalCentavos: 0,
    saidasCentavos: 0,
    saldoCentavos: 0,
  }))

  const porCompetencia = new Map(meses.map((m) => [m.competencia, m]))

  for (const l of lancamentos) {
    const mes = porCompetencia.get(competenciaDe(l.data))
    if (mes === undefined) continue

    if (l.tipo === 'saida') {
      mes.saidasCentavos += l.valorCentavos
    } else if (l.recebido) {
      mes.recebidoCentavos += l.valorCentavos
    } else {
      mes.programadoCentavos += l.valorCentavos
    }
  }

  for (const m of meses) {
    m.totalCentavos = m.recebidoCentavos + m.programadoCentavos
    m.saldoCentavos = m.recebidoCentavos - m.saidasCentavos
  }

  return meses
}

/** Totais do ano inteiro, para o cabeçalho da análise. */
export function totaisDoAno(meses: MesDoAno[]) {
  return meses.reduce(
    (t, m) => ({
      recebidoCentavos: t.recebidoCentavos + m.recebidoCentavos,
      programadoCentavos: t.programadoCentavos + m.programadoCentavos,
      saidasCentavos: t.saidasCentavos + m.saidasCentavos,
      saldoCentavos: t.saldoCentavos + m.saldoCentavos,
    }),
    { recebidoCentavos: 0, programadoCentavos: 0, saidasCentavos: 0, saldoCentavos: 0 },
  )
}
