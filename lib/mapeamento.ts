import type { GastoFixo, Lancamento, PagoPor } from './tipos'

export type LinhaLancamento = {
  id: string
  tipo: string
  data: string
  data_fim: string | null
  valor_centavos: number
  descricao: string
  categoria_id: string | null
  origem: string | null
  hospedes: number | null
  recebido: boolean
  pago_por: string | null
  criado_em: string
}

/** Banco sem a migração 006 devolve null: quem paga, por padrão, é você. */
function paraPagoPor(valor: string | null | undefined): PagoPor {
  return valor === 'socio' ? 'socio' : 'voce'
}

export type EntradaLancamento = Omit<Lancamento, 'id' | 'criadoEm'>

export function paraLancamento(linha: LinhaLancamento): Lancamento {
  return {
    id: linha.id,
    tipo: linha.tipo === 'entrada' ? 'entrada' : 'saida',
    data: linha.data,
    dataFim: linha.data_fim,
    valorCentavos: linha.valor_centavos,
    descricao: linha.descricao,
    categoriaId: linha.categoria_id,
    origem: linha.origem,
    hospedes: linha.hospedes,
    // Banco sem a migração 005 não tem a coluna: tratar como recebido
    // preserva o comportamento anterior em vez de zerar o saldo.
    recebido: linha.recebido !== false,
    pagoPor: paraPagoPor(linha.pago_por),
    criadoEm: linha.criado_em,
  }
}

/**
 * Converte para linha do banco, zerando os campos que não pertencem ao tipo.
 * Sem isso, um formulário que já teve os dois modos preenchidos mandaria
 * `origem` numa saída e a constraint `campos_por_tipo` rejeitaria o insert.
 */
export function paraLinhaLancamento(entrada: EntradaLancamento) {
  const ehEntrada = entrada.tipo === 'entrada'
  return {
    tipo: entrada.tipo,
    data: entrada.data,
    data_fim: ehEntrada ? entrada.dataFim : null,
    valor_centavos: entrada.valorCentavos,
    descricao: entrada.descricao,
    categoria_id: ehEntrada ? null : entrada.categoriaId,
    origem: ehEntrada ? entrada.origem : null,
    hospedes: ehEntrada ? entrada.hospedes : null,
    // Saída não tem "programado": o gasto é lançado quando acontece.
    recebido: ehEntrada ? entrada.recebido : true,
    // Entrada cai sempre na sua conta; só saída tem quem pagou.
    pago_por: ehEntrada ? 'voce' : entrada.pagoPor,
  }
}

export type LinhaGastoFixo = {
  id: string
  nome: string
  valor_referencia_centavos: number
  categoria_id: string
  arquivada: boolean
  competencia_inicial: string
  pago_por: string | null
}

export function paraGastoFixo(linha: LinhaGastoFixo): GastoFixo {
  return {
    id: linha.id,
    nome: linha.nome,
    valorReferenciaCentavos: linha.valor_referencia_centavos,
    categoriaId: linha.categoria_id,
    arquivada: linha.arquivada,
    competenciaInicial: linha.competencia_inicial,
    pagoPor: paraPagoPor(linha.pago_por),
  }
}
