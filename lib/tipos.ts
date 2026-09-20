export type TipoLancamento = 'entrada' | 'saida'

export type Categoria = {
  id: string
  nome: string
  cor: string
  arquivada: boolean
  /**
   * Se o gasto desta categoria desconta do resultado antes do rateio.
   * Falso na categoria de repasse ao sócio: pagar o sócio não é custo de
   * operação, é quitação da parte dele.
   */
  entraNoRateio: boolean
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

export type Configuracoes = {
  /** Quanto do líquido fica com você, de 0 a 100. O sócio fica com o resto. */
  percentualGestao: number
  nomeSocio: string
}
