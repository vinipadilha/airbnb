import { parseValorBRL } from './dinheiro'
import type { Lancamento } from './tipos'

export type LinhaImport = {
  /** Número da linha no arquivo, contando o cabeçalho como 1. */
  linha: number
  data: string | null
  valorCentavos: number | null
  descricao: string
  noites: number | null
  hospedes: number | null
  erro: string | null
}

export type LinhaImportMarcada = LinhaImport & { duplicada: boolean }

/** Nomes alternativos que a planilha do usuário pode trazer. */
const ALIASES: Record<string, string> = {
  dia: 'data',
  total: 'valor',
  valor_total: 'valor',
  qtd_noites: 'noites',
  hospede: 'hospedes',
}

function normalizarCabecalho(nome: string): string {
  const limpo = nome
    .trim()
    .replace(/^"|"$/g, '')
    .toLowerCase()
    .normalize('NFD')
    // Tira acentos: "Descrição" e "descricao" viram a mesma coluna.
    .replace(/[̀-ͯ]/g, '')
  return ALIASES[limpo] ?? limpo
}

/** Detecta o separador contando ocorrências na linha de cabeçalho. */
function detectarSeparador(cabecalho: string): string {
  return (cabecalho.match(/;/g)?.length ?? 0) >
    (cabecalho.match(/,/g)?.length ?? 0)
    ? ';'
    : ','
}

/**
 * Divide uma linha respeitando aspas.
 * Um `split` puro quebraria "Reserva, 3 noites" no meio e engoliria metade da
 * descrição sem acusar erro nenhum — e o Excel põe aspas exatamente quando o
 * campo contém o separador, que numa descrição de reserva é o caso comum.
 */
function dividirLinha(linha: string, separador: string): string[] {
  const celulas: string[] = []
  let atual = ''
  let dentroDeAspas = false

  for (let i = 0; i < linha.length; i++) {
    const c = linha[i]

    if (c === '"') {
      // "" dentro de campo entre aspas representa uma aspa literal.
      if (dentroDeAspas && linha[i + 1] === '"') {
        atual += '"'
        i++
      } else {
        dentroDeAspas = !dentroDeAspas
      }
      continue
    }

    if (c === separador && !dentroDeAspas) {
      celulas.push(atual)
      atual = ''
      continue
    }

    atual += c
  }

  celulas.push(atual)
  return celulas
}

/** Aceita DD/MM/AAAA e AAAA-MM-DD. Devolve AAAA-MM-DD ou null. */
function parseData(bruto: string): string | null {
  const texto = bruto.trim()

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto)
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(texto)

  let ano: number, mes: number, dia: number
  if (iso) {
    ;[, ano, mes, dia] = [0, Number(iso[1]), Number(iso[2]), Number(iso[3])]
  } else if (br) {
    ;[, dia, mes, ano] = [0, Number(br[1]), Number(br[2]), Number(br[3])]
  } else {
    return null
  }

  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null
  // Valida o dia contra o mês de verdade (31/02 não existe).
  const d = new Date(Date.UTC(ano, mes - 1, dia))
  if (d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) return null

  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

function parseInteiroPositivo(bruto: string | undefined): number | null {
  if (bruto === undefined) return null
  const n = Number(bruto.trim())
  if (!Number.isInteger(n) || n <= 0) return null
  return n
}

/**
 * Converte o texto de um CSV de reservas em linhas validadas.
 * Não grava nada: devolve o que a tela de preview precisa mostrar.
 */
export function parseCsvEntradas(texto: string): LinhaImport[] {
  // Guarda o número original de cada linha ANTES de descartar as vazias. É esse
  // número que o preview mostra ao lado do erro, e ele precisa bater com o que
  // o usuário vê quando abre o arquivo.
  const numeradas = texto
    .split(/\r?\n/)
    .map((conteudo, indice) => ({ numero: indice + 1, conteudo }))
    .filter((l) => l.conteudo.trim() !== '')

  if (numeradas.length === 0) throw new Error('Arquivo vazio.')

  const cabecalho = numeradas[0]
  const separador = detectarSeparador(cabecalho.conteudo)
  const colunas = dividirLinha(cabecalho.conteudo, separador).map(normalizarCabecalho)

  for (const obrigatoria of ['data', 'valor', 'descricao']) {
    if (!colunas.includes(obrigatoria)) {
      throw new Error(
        `Cabeçalho inválido: falta a coluna "${obrigatoria}". ` +
          `Esperado: data, valor, descricao (e opcionalmente noites, hospedes).`,
      )
    }
  }

  const indice = (nome: string) => colunas.indexOf(nome)

  return numeradas.slice(1).map(({ numero, conteudo }) => {
    const celulas = dividirLinha(conteudo, separador)
    const pegar = (nome: string) => {
      const i = indice(nome)
      return i >= 0 ? (celulas[i] ?? '').trim() : ''
    }

    const data = parseData(pegar('data'))
    const valorCentavos = parseValorBRL(pegar('valor'))

    let erro: string | null = null
    if (data === null) erro = `Data inválida: "${pegar('data')}"`
    else if (valorCentavos === null) erro = `Valor inválido: "${pegar('valor')}"`

    return {
      linha: numero,
      data,
      valorCentavos,
      descricao: pegar('descricao'),
      noites: indice('noites') >= 0 ? parseInteiroPositivo(pegar('noites')) : null,
      hospedes: indice('hospedes') >= 0 ? parseInteiroPositivo(pegar('hospedes')) : null,
      erro,
    }
  })
}

/**
 * Marca linhas prováveis duplicatas por data + valor, contra o banco e contra
 * as linhas anteriores do próprio arquivo. A primeira ocorrência dentro do
 * arquivo não é marcada; as repetições são.
 */
/** Só precisa destes três campos — assim o chamador pode buscar menos do banco. */
export type LancamentoExistente = Pick<Lancamento, 'tipo' | 'data' | 'valorCentavos'>

export function marcarDuplicados(
  linhas: LinhaImport[],
  existentes: LancamentoExistente[],
): LinhaImportMarcada[] {
  const vistos = new Set(
    existentes
      .filter((l) => l.tipo === 'entrada')
      .map((l) => `${l.data}|${l.valorCentavos}`),
  )

  return linhas.map((linha) => {
    if (linha.erro !== null || linha.data === null || linha.valorCentavos === null) {
      return { ...linha, duplicada: false }
    }
    const chave = `${linha.data}|${linha.valorCentavos}`
    const duplicada = vistos.has(chave)
    vistos.add(chave)
    return { ...linha, duplicada }
  })
}
