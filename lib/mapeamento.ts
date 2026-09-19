import type { GastoFixo, Lancamento } from './tipos'

export type LinhaLancamento = {
  id: string
  tipo: string
  data: string
  valor_centavos: number
  descricao: string
  categoria_id: string | null
  origem: string | null
  noites: number | null
  hospedes: number | null
  criado_em: string
}

export type EntradaLancamento = Omit<Lancamento, 'id' | 'criadoEm'>

export function paraLancamento(linha: LinhaLancamento): Lancamento {
  return {
    id: linha.id,
    tipo: linha.tipo === 'entrada' ? 'entrada' : 'saida',
    data: linha.data,
    valorCentavos: linha.valor_centavos,
    descricao: linha.descricao,
    categoriaId: linha.categoria_id,
    origem: linha.origem,
    noites: linha.noites,
    hospedes: linha.hospedes,
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
    valor_centavos: entrada.valorCentavos,
    descricao: entrada.descricao,
    categoria_id: ehEntrada ? null : entrada.categoriaId,
    origem: ehEntrada ? entrada.origem : null,
    noites: ehEntrada ? entrada.noites : null,
    hospedes: ehEntrada ? entrada.hospedes : null,
  }
}

export type LinhaGastoFixo = {
  id: string
  nome: string
  valor_referencia_centavos: number
  categoria_id: string
  arquivada: boolean
  competencia_inicial: string
}

export function paraGastoFixo(linha: LinhaGastoFixo): GastoFixo {
  return {
    id: linha.id,
    nome: linha.nome,
    valorReferenciaCentavos: linha.valor_referencia_centavos,
    categoriaId: linha.categoria_id,
    arquivada: linha.arquivada,
    competenciaInicial: linha.competencia_inicial,
  }
}
