export type TipoLancamento = 'entrada' | 'saida'

export type Categoria = {
  id: string
  nome: string
  cor: string
  arquivada: boolean
}

export type Lancamento = {
  id: string
  tipo: TipoLancamento
  /** YYYY-MM-DD. Em entradas, é o check-in. */
  data: string
  /** YYYY-MM-DD. Check-out da reserva; null em saídas e em receitas sem estadia. */
  dataFim: string | null
  valorCentavos: number
  descricao: string
  /** Só em saídas. */
  categoriaId: string | null
  /** Só em entradas. */
  origem: string | null
  hospedes: number | null
  criadoEm: string
}

export type GastoFixo = {
  id: string
  nome: string
  valorReferenciaCentavos: number
  categoriaId: string
  arquivada: boolean
  /** YYYY-MM a partir do qual o gasto passa a gerar pendência. */
  competenciaInicial: string
}

export type GastoFixoLancado = {
  gastoFixoId: string
  /** YYYY-MM */
  competencia: string
  lancamentoId: string
}
