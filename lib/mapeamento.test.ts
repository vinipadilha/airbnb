import test from 'node:test'
import assert from 'node:assert/strict'
import { paraLancamento, paraLinhaLancamento } from './mapeamento'

test('paraLancamento converte entrada do banco', () => {
  const linha = {
    id: 'abc',
    tipo: 'entrada',
    data: '2026-09-03',
    data_fim: '2026-09-06',
    valor_centavos: 50000,
    descricao: 'Reserva 3 noites',
    categoria_id: null,
    origem: 'Airbnb',
    hospedes: 2,
    recebido: true,
    pago_por: 'voce',
    criado_em: '2026-09-03T12:00:00Z',
  }
  assert.deepEqual(paraLancamento(linha), {
    id: 'abc',
    tipo: 'entrada',
    data: '2026-09-03',
    dataFim: '2026-09-06',
    valorCentavos: 50000,
    descricao: 'Reserva 3 noites',
    categoriaId: null,
    origem: 'Airbnb',
    hospedes: 2,
    recebido: true,
    pagoPor: 'voce',
    criadoEm: '2026-09-03T12:00:00Z',
  })
})

test('paraLinhaLancamento zera os campos do outro tipo numa saída', () => {
  const linha = paraLinhaLancamento({
    tipo: 'saida',
    data: '2026-09-05',
    dataFim: '2026-09-08',
    valorCentavos: 9800,
    descricao: 'Internet',
    categoriaId: 'cat-1',
    origem: 'Airbnb',
    hospedes: 2,
    recebido: true,
    pagoPor: 'voce',
  })
  assert.deepEqual(linha, {
    tipo: 'saida',
    data: '2026-09-05',
    data_fim: null,
    valor_centavos: 9800,
    descricao: 'Internet',
    categoria_id: 'cat-1',
    origem: null,
    hospedes: null,
    recebido: true,
    pago_por: 'voce',
  })
})

test('paraLinhaLancamento zera a categoria numa entrada', () => {
  const linha = paraLinhaLancamento({
    tipo: 'entrada',
    data: '2026-09-03',
    dataFim: '2026-09-06',
    valorCentavos: 50000,
    descricao: 'Reserva',
    categoriaId: 'cat-1',
    origem: 'Airbnb',
    hospedes: null,
    recebido: true,
    pagoPor: 'voce',
  })
  assert.equal(linha.categoria_id, null)
  assert.equal(linha.origem, 'Airbnb')
})

test('entrada programada mantém recebido falso na ida para o banco', () => {
  const linha = paraLinhaLancamento({
    tipo: 'entrada',
    data: '2026-10-10',
    dataFim: '2026-10-13',
    valorCentavos: 60000,
    descricao: 'Reserva futura',
    categoriaId: null,
    origem: 'Airbnb',
    hospedes: null,
    recebido: false,
    pagoPor: 'voce',
  })
  assert.equal(linha.recebido, false)
})

test('saída nunca vai programada para o banco', () => {
  const linha = paraLinhaLancamento({
    tipo: 'saida',
    data: '2026-10-10',
    dataFim: null,
    valorCentavos: 5000,
    descricao: 'Mercado',
    categoriaId: 'cat-1',
    origem: null,
    hospedes: null,
    recebido: false,
    pagoPor: 'voce',
  })
  assert.equal(linha.recebido, true)
})

test('saída guarda quem pagou', () => {
  const linha = paraLinhaLancamento({
    tipo: 'saida',
    data: '2026-09-10',
    dataFim: null,
    valorCentavos: 60000,
    descricao: 'Condomínio',
    categoriaId: 'cat-1',
    origem: null,
    hospedes: null,
    recebido: true,
    pagoPor: 'socio',
  })
  assert.equal(linha.pago_por, 'socio')
})

test('entrada é sempre recebida por você, mesmo se marcarem outra coisa', () => {
  const linha = paraLinhaLancamento({
    tipo: 'entrada',
    data: '2026-09-10',
    dataFim: '2026-09-12',
    valorCentavos: 60000,
    descricao: 'Reserva',
    categoriaId: null,
    origem: 'Airbnb',
    hospedes: null,
    recebido: true,
    pagoPor: 'socio',
  })
  assert.equal(linha.pago_por, 'voce')
})
