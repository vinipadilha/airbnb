import test from 'node:test'
import assert from 'node:assert/strict'
import { paraLancamento, paraLinhaLancamento } from './mapeamento'

test('paraLancamento converte entrada do banco', () => {
  const linha = {
    id: 'abc',
    tipo: 'entrada',
    data: '2026-09-03',
    valor_centavos: 50000,
    descricao: 'Reserva 3 noites',
    categoria_id: null,
    origem: 'Airbnb',
    noites: 3,
    hospedes: 2,
    criado_em: '2026-09-03T12:00:00Z',
  }
  assert.deepEqual(paraLancamento(linha), {
    id: 'abc',
    tipo: 'entrada',
    data: '2026-09-03',
    valorCentavos: 50000,
    descricao: 'Reserva 3 noites',
    categoriaId: null,
    origem: 'Airbnb',
    noites: 3,
    hospedes: 2,
    criadoEm: '2026-09-03T12:00:00Z',
  })
})

test('paraLinhaLancamento zera os campos do outro tipo numa saída', () => {
  const linha = paraLinhaLancamento({
    tipo: 'saida',
    data: '2026-09-05',
    valorCentavos: 9800,
    descricao: 'Internet',
    categoriaId: 'cat-1',
    origem: 'Airbnb',
    noites: 3,
    hospedes: 2,
  })
  assert.deepEqual(linha, {
    tipo: 'saida',
    data: '2026-09-05',
    valor_centavos: 9800,
    descricao: 'Internet',
    categoria_id: 'cat-1',
    origem: null,
    noites: null,
    hospedes: null,
  })
})

test('paraLinhaLancamento zera a categoria numa entrada', () => {
  const linha = paraLinhaLancamento({
    tipo: 'entrada',
    data: '2026-09-03',
    valorCentavos: 50000,
    descricao: 'Reserva',
    categoriaId: 'cat-1',
    origem: 'Airbnb',
    noites: null,
    hospedes: null,
  })
  assert.equal(linha.categoria_id, null)
  assert.equal(linha.origem, 'Airbnb')
})
