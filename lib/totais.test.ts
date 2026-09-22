import test from 'node:test'
import assert from 'node:assert/strict'
import { saidasPorCategoria, saldoAcumulado, totaisDoMes } from './totais'
import type { Lancamento } from './tipos'

function lanc(p: Partial<Lancamento> & Pick<Lancamento, 'id' | 'tipo' | 'data' | 'valorCentavos'>): Lancamento {
  return {
    descricao: 'x',
    dataFim: null,
    recebido: true,
    categoriaId: null,
    origem: null,
    hospedes: null,
    pagoPor: 'voce',
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
    entradasProgramadas: 0,
    saidas: 21800,
    saldo: 58200,
    entradasEstimadas: 80000,
    saldoEstimado: 58200,
  })
})

test('totaisDoMes devolve zeros em mês sem lançamento', () => {
  assert.deepEqual(totaisDoMes(base, '2026-07'), {
    entradas: 0,
    entradasProgramadas: 0,
    saidas: 0,
    saldo: 0,
    entradasEstimadas: 0,
    saldoEstimado: 0,
  })
})

test('totaisDoMes aceita saldo negativo', () => {
  const caros = [
    lanc({ id: 'a', tipo: 'entrada', data: '2026-09-01', valorCentavos: 1000 }),
    lanc({ id: 'b', tipo: 'saida', data: '2026-09-02', valorCentavos: 3000 }),
  ]
  assert.equal(totaisDoMes(caros, '2026-09').saldo, -2000)
})

test('reserva que atravessa meses conta inteira no mês do check-in', () => {
  const atravessa = lanc({
    id: 'L', tipo: 'entrada', data: '2026-09-28', valorCentavos: 100000, origem: 'Airbnb',
  })
  atravessa.dataFim = '2026-10-08'
  // O Airbnb paga uma vez, logo após o check-in: o dinheiro entra em setembro
  // inteiro, não fatiado entre setembro e outubro.
  assert.equal(totaisDoMes([atravessa], '2026-09').entradas, 100000)
  assert.equal(totaisDoMes([atravessa], '2026-10').entradas, 0)
})

test('entrada programada fica fora das entradas e do saldo', () => {
  const programada = lanc({
    id: 'P', tipo: 'entrada', data: '2026-09-25', valorCentavos: 70000, origem: 'Airbnb',
  })
  programada.recebido = false
  const r = totaisDoMes([...base, programada], '2026-09')
  assert.equal(r.entradas, 80000)
  assert.equal(r.entradasProgramadas, 70000)
  assert.equal(r.saldo, 58200)
})

test('estimado soma o programado ao recebido', () => {
  const programada = lanc({
    id: 'P', tipo: 'entrada', data: '2026-09-25', valorCentavos: 70000, origem: 'Airbnb',
  })
  programada.recebido = false
  const r = totaisDoMes([...base, programada], '2026-09')
  assert.equal(r.entradas, 80000)
  assert.equal(r.entradasEstimadas, 150000)
  // O saldo real desconta os gastos do que entrou; o estimado, do que vai entrar.
  assert.equal(r.saldo, 58200)
  assert.equal(r.saldoEstimado, 128200)
})

test('sem programado, estimado e real são iguais', () => {
  const r = totaisDoMes(base, '2026-09')
  assert.equal(r.entradasEstimadas, r.entradas)
  assert.equal(r.saldoEstimado, r.saldo)
})

test('saldoAcumulado ignora o que ainda não foi recebido', () => {
  const programada = lanc({
    id: 'P', tipo: 'entrada', data: '2026-09-25', valorCentavos: 70000, origem: 'Airbnb',
  })
  programada.recebido = false
  assert.equal(saldoAcumulado([...base, programada]), saldoAcumulado(base))
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
