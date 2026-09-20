import { competenciaDe } from './competencia'
import type { Lancamento } from './tipos'

export type DiaDoMes = {
  /** YYYY-MM-DD */
  data: string
  /** Número do dia, para desenhar na célula. */
  dia: number
  /** Dia da semana, 0 = domingo. */
  diaDaSemana: number
  ocupado: boolean
  checkIn: boolean
  checkOut: boolean
  /** Descrição da reserva que ocupa a noite, quando há uma. */
  reserva: string | null
}

export type Ocupacao = {
  noitesOcupadas: number
  diasNoMes: number
  /** Inteiro de 0 a 100. */
  percentual: number
}

/**
 * Datas são strings YYYY-MM-DD e a aritmética acontece em UTC de propósito:
 * construir Date a partir da string em fuso local faria o dia "andar" conforme
 * o fuso de quem roda o código.
 */
function paraUTC(data: string): Date {
  const [ano, mes, dia] = data.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, dia))
}

function paraTexto(d: Date): string {
  return d.toISOString().slice(0, 10)
}

const UM_DIA = 24 * 60 * 60 * 1000

/** Quantidade de dias do mês de uma competência. */
export function diasNaCompetencia(competencia: string): number {
  const [ano, mes] = competencia.split('-').map(Number)
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate()
}

/**
 * Noites de uma reserva: a diferença entre check-in e check-out.
 * Saídas não têm noites.
 */
export function noitesDe(lancamento: Lancamento): number {
  if (lancamento.tipo !== 'entrada' || lancamento.dataFim === null) return 0
  const noites = (paraUTC(lancamento.dataFim).getTime() - paraUTC(lancamento.data).getTime()) / UM_DIA
  return noites > 0 ? Math.round(noites) : 0
}

/**
 * Noites da reserva que caem dentro da competência.
 *
 * Uma noite pertence ao dia em que o hóspede dorme, então o dia do check-out
 * não conta. É isso que faz uma estadia de 244 noites aparecer distribuída
 * pelos nove meses que ela atravessa, em vez de inteira no mês do check-in.
 */
export function noitesNoMes(lancamento: Lancamento, competencia: string): number {
  const total = noitesDe(lancamento)
  if (total === 0) return 0

  let contador = 0
  const fim = paraUTC(lancamento.dataFim as string).getTime()

  for (let t = paraUTC(lancamento.data).getTime(); t < fim; t += UM_DIA) {
    if (paraTexto(new Date(t)).slice(0, 7) === competencia) contador++
  }
  return contador
}

/**
 * Parte da receita da reserva atribuível à competência, rateada por noite.
 *
 * O rateio não divide e arredonda: distribui os centavos que sobram, um por
 * noite, começando pela primeira. Arredondar cada noite faria dinheiro
 * evaporar — numa estadia de 244 noites a R$ 27.104,64, sumiam R$ 1,12, e a
 * soma dos meses não fechava com o valor da reserva.
 */
export function receitaNoMes(lancamento: Lancamento, competencia: string): number {
  const total = noitesDe(lancamento)

  // Entrada sem período (receita que não é estadia) pertence inteira ao mês
  // da sua data.
  if (total === 0) {
    return competenciaDe(lancamento.data) === competencia ? lancamento.valorCentavos : 0
  }

  const porNoite = Math.floor(lancamento.valorCentavos / total)
  const sobra = lancamento.valorCentavos - porNoite * total

  let soma = 0
  const fim = paraUTC(lancamento.dataFim as string).getTime()
  let indice = 0

  for (let t = paraUTC(lancamento.data).getTime(); t < fim; t += UM_DIA, indice++) {
    if (paraTexto(new Date(t)).slice(0, 7) !== competencia) continue
    soma += porNoite + (indice < sobra ? 1 : 0)
  }
  return soma
}

/** Os dias da competência, cada um sabendo se está ocupado. */
export function diasDoMes(lancamentos: Lancamento[], competencia: string): DiaDoMes[] {
  const reservas = lancamentos.filter((l) => noitesDe(l) > 0)

  const ocupadas = new Map<string, string>()
  const checkIns = new Set<string>()
  const checkOuts = new Set<string>()

  for (const r of reservas) {
    const fim = paraUTC(r.dataFim as string).getTime()
    for (let t = paraUTC(r.data).getTime(); t < fim; t += UM_DIA) {
      ocupadas.set(paraTexto(new Date(t)), r.descricao)
    }
    checkIns.add(r.data)
    checkOuts.add(r.dataFim as string)
  }

  const total = diasNaCompetencia(competencia)
  const dias: DiaDoMes[] = []

  for (let dia = 1; dia <= total; dia++) {
    const data = `${competencia}-${String(dia).padStart(2, '0')}`
    dias.push({
      data,
      dia,
      diaDaSemana: paraUTC(data).getUTCDay(),
      ocupado: ocupadas.has(data),
      checkIn: checkIns.has(data),
      checkOut: checkOuts.has(data),
      reserva: ocupadas.get(data) ?? null,
    })
  }
  return dias
}

export function ocupacaoDoMes(lancamentos: Lancamento[], competencia: string): Ocupacao {
  const diasNoMes = diasNaCompetencia(competencia)
  const noitesOcupadas = diasDoMes(lancamentos, competencia).filter((d) => d.ocupado).length
  return {
    noitesOcupadas,
    diasNoMes,
    percentual: Math.round((noitesOcupadas / diasNoMes) * 100),
  }
}

/** Diária média do mês: receita da competência dividida pelas noites dela. */
export function diariaMediaDoMes(lancamentos: Lancamento[], competencia: string): number {
  let receita = 0
  let noites = 0
  for (const l of lancamentos) {
    if (l.tipo !== 'entrada') continue
    const n = noitesNoMes(l, competencia)
    if (n === 0) continue
    receita += receitaNoMes(l, competencia)
    noites += n
  }
  return noites === 0 ? 0 : Math.round(receita / noites)
}

/** Soma dias a uma data YYYY-MM-DD, sem sair do calendário UTC. */
export function somarDias(data: string, dias: number): string {
  return paraTexto(new Date(paraUTC(data).getTime() + dias * UM_DIA))
}

/** Noites entre duas datas YYYY-MM-DD. */
export function noitesEntre(inicio: string, fim: string): number {
  return Math.max(0, Math.round((paraUTC(fim).getTime() - paraUTC(inicio).getTime()) / UM_DIA))
}
