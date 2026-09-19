const TZ = 'America/Sao_Paulo'

// 'sv-SE' formata como YYYY-MM-DD, que é exatamente o formato que queremos.
const FORMATADOR_DATA = new Intl.DateTimeFormat('sv-SE', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

/** '2026-09-18' -> '2026-09' */
export function competenciaDe(data: string): string {
  return data.slice(0, 7)
}

/**
 * Data de hoje (YYYY-MM-DD) no fuso do usuário.
 * O servidor roda em UTC; usar a data UTC jogaria lançamentos noturnos para o
 * mês errado.
 */
export function hojeEmSaoPaulo(agora: Date = new Date()): string {
  return FORMATADOR_DATA.format(agora)
}

/** Competência corrente no fuso do usuário. */
export function competenciaAtual(agora: Date = new Date()): string {
  return competenciaDe(hojeEmSaoPaulo(agora))
}

/** Soma (ou subtrai) meses a uma competência. */
export function deslocarCompetencia(competencia: string, delta: number): string {
  const [ano, mes] = competencia.split('-').map(Number)
  const total = ano * 12 + (mes - 1) + delta
  const novoAno = Math.floor(total / 12)
  const novoMes = total % 12
  return `${novoAno}-${String(novoMes + 1).padStart(2, '0')}`
}

/** '2026-09' -> 'setembro 2026' */
export function rotuloCompetencia(competencia: string): string {
  const [ano, mes] = competencia.split('-').map(Number)
  return `${MESES[mes - 1]} ${ano}`
}
