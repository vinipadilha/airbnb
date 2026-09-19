import test from 'node:test'
import assert from 'node:assert/strict'
import { saidasPorCategoria, saldoAcumulado, totaisDoMes } from './totais'
import type { Lancamento } from './tipos'

function lanc(p: Partial<Lancamento> & Pick<Lancamento, 'id' | 'tipo' | 'data' | 'valorCentavos'>): Lancamento {
  return {
    descricao: 'x',
    categoriaId: null,
    origem: null,
    noites: null,
    hospedes: null,
    criadoEm: '2026-09-01T00:00:00Z',
    ...p,
  }
}

const base: Lancamento[] = [
  lanc({ id: '1', tipo: 'entrada', data: '2026-09-03', valorCentavos: 50000, origem: 'Airbnb' }),
  lanc({ id: '2', tipo: 'entrada', data: '2026-09-20', valorCentavos: 30000, origem: 'Airbnb' }),
  lanc({ id: '3', tipo: 'saida', data: '2026-09-05', valorCentavos: 9800, categoriaId: 'fixas' }),
  lanc({ id: '4', tipo: 'saida', data: '2026-09-15', valorCentavos: 12000, categoriaId: 'limpeza' }),
  lanc({ id: '5', tipo: 'entrada', data: '2026-08-10', valorCentavos: 40000, origem: 'Airbnb' }),
  lanc({ id: '6', tipo: 'saida', data: '2026-08-11', valorCentavos: 5000, categoriaId: 'limpeza' }),
]

test('totaisDoMes soma só o mês pedido', () => {
  assert.deepEqual(totaisDoMes(base, '2026-09'), {
    entradas: 80000,
    saidas: 21800,
    saldo: 58200,
  })
})

test('totaisDoMes devolve zeros em mês sem lançamento', () => {
  assert.deepEqual(totaisDoMes(base, '2026-07'), {
    entradas: 0,
    saidas: 0,
    saldo: 0,
  })
})

test('totaisDoMes aceita saldo negativo', () => {
  const caros = [
    lanc({ id: 'a', tipo: 'entrada', data: '2026-09-01', valorCentavos: 1000 }),
    lanc({ id: 'b', tipo: 'saida', data: '2026-09-02', valorCentavos: 3000 }),
  ]
  assert.equal(totaisDoMes(caros, '2026-09').saldo, -2000)
})

test('saldoAcumulado considera o histórico inteiro', () => {
  assert.equal(saldoAcumulado(base), 50000 + 30000 + 40000 - 9800 - 12000 - 5000)
})

test('saldoAcumulado de lista vazia é zero', () => {
  assert.equal(saldoAcumulado([]), 0)
})

test('saidasPorCategoria agrupa e ordena do maior para o menor', () => {
  assert.deepEqual(saidasPorCategoria(base, '2026-09'), [
    { categoriaId: 'limpeza', totalCentavos: 12000 },
    { categoriaId: 'fixas', totalCentavos: 9800 },
  ])
})

test('saidasPorCategoria ignora entradas', () => {
  const so = [lanc({ id: 'x', tipo: 'entrada', data: '2026-09-01', valorCentavos: 9999 })]
  assert.deepEqual(saidasPorCategoria(so, '2026-09'), [])
})

test('saidasPorCategoria agrupa saídas sem categoria sob null', () => {
  const orfa = [lanc({ id: 'y', tipo: 'saida', data: '2026-09-01', valorCentavos: 700 })]
  assert.deepEqual(saidasPorCategoria(orfa, '2026-09'), [
    { categoriaId: null, totalCentavos: 700 },
  ])
})
