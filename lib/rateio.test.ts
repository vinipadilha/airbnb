import test from 'node:test'
import assert from 'node:assert/strict'
import { calcularRateio } from './rateio'
import type { Categoria, Lancamento, Repasse } from './tipos'

const limpeza: Categoria = {
  id: 'lim', nome: 'Limpeza', cor: '#0ea5e9', arquivada: false, entraNoRateio: true,
}
const categorias = [limpeza]

function lanc(p: Partial<Lancamento> & Pick<Lancamento, 'id' | 'tipo' | 'data' | 'valorCentavos'>): Lancamento {
  return {
    dataFim: null, descricao: '', categoriaId: null, origem: null,
    hospedes: null, criadoEm: '', ...p,
  }
}

function rep(data: string, valorCentavos: number): Repasse {
  return { id: data, data, valorCentavos, observacao: '' }
}

const entrada = lanc({ id: 'e', tipo: 'entrada', data: '2026-09-02', valorCentavos: 324158, origem: 'Airbnb' })
const gasto = lanc({ id: 'g', tipo: 'saida', data: '2026-09-20', valorCentavos: 112886, categoriaId: 'lim' })

test('divide o líquido depois de descontar os gastos', () => {
  const r = calcularRateio([entrada, gasto], categorias, [], '2026-09', 12)
  assert.equal(r.entradasCentavos, 324158)
  assert.equal(r.gastosCentavos, 112886)
  assert.equal(r.liquidoCentavos, 211272)
  assert.equal(r.suaParteCentavos, 25353)
  assert.equal(r.parteDoSocioCentavos, 185919)
})

test('as duas partes somam exatamente o líquido', () => {
  const r = calcularRateio([entrada, gasto], categorias, [], '2026-09', 12)
  assert.equal(r.suaParteCentavos + r.parteDoSocioCentavos, r.liquidoCentavos)
})

test('nenhum centavo se perde em percentual quebrado', () => {
  const quebrado = lanc({ id: 'q', tipo: 'entrada', data: '2026-09-01', valorCentavos: 10001, origem: 'Airbnb' })
  for (const pct of [12, 33, 50, 7]) {
    const r = calcularRateio([quebrado], categorias, [], '2026-09', pct)
    assert.equal(r.suaParteCentavos + r.parteDoSocioCentavos, r.liquidoCentavos, `pct ${pct}`)
  }
})

test('o repasse abate a dívida sem mexer no líquido', () => {
  const r = calcularRateio([entrada, gasto], categorias, [rep('2026-09-25', 100000)], '2026-09', 12)
  // O líquido não muda: repasse não é custo de operação.
  assert.equal(r.liquidoCentavos, 211272)
  assert.equal(r.gastosCentavos, 112886)
  assert.equal(r.repassadoCentavos, 100000)
  assert.equal(r.aRepassarCentavos, 185919 - 100000)
})

test('soma vários repasses do mês', () => {
  const r = calcularRateio(
    [entrada, gasto], categorias,
    [rep('2026-09-10', 50000), rep('2026-09-25', 30000)],
    '2026-09', 12,
  )
  assert.equal(r.repassadoCentavos, 80000)
})

test('repasse de outro mês não conta neste', () => {
  const r = calcularRateio([entrada, gasto], categorias, [rep('2026-08-30', 90000)], '2026-09', 12)
  assert.equal(r.repassadoCentavos, 0)
  assert.equal(r.aRepassarCentavos, r.parteDoSocioCentavos)
})

test('sem repasse nenhum, falta tudo', () => {
  const r = calcularRateio([entrada, gasto], categorias, [], '2026-09', 12)
  assert.equal(r.repassadoCentavos, 0)
  assert.equal(r.aRepassarCentavos, r.parteDoSocioCentavos)
})

test('repasse a mais deixa o saldo negativo — você adiantou', () => {
  const r = calcularRateio([entrada, gasto], categorias, [rep('2026-09-25', 200000)], '2026-09', 12)
  assert.ok(r.aRepassarCentavos < 0)
  assert.equal(r.aRepassarCentavos, 185919 - 200000)
})

test('mês no prejuízo divide o prejuízo na mesma proporção', () => {
  const caro = lanc({ id: 'c', tipo: 'saida', data: '2026-09-10', valorCentavos: 500000, categoriaId: 'lim' })
  const r = calcularRateio([entrada, caro], categorias, [], '2026-09', 12)
  assert.equal(r.liquidoCentavos, 324158 - 500000)
  assert.ok(r.suaParteCentavos < 0)
  assert.ok(r.parteDoSocioCentavos < 0)
  assert.equal(r.suaParteCentavos + r.parteDoSocioCentavos, r.liquidoCentavos)
})

test('mês vazio devolve tudo zerado', () => {
  const r = calcularRateio([], categorias, [], '2026-07', 12)
  assert.equal(r.liquidoCentavos, 0)
  assert.equal(r.parteDoSocioCentavos, 0)
  assert.equal(r.aRepassarCentavos, 0)
})

test('categoria fora do rateio não é gasto operacional nem repasse', () => {
  const foraDoRateio: Categoria = {
    id: 'x', nome: 'Antiga', cor: '#000', arquivada: true, entraNoRateio: false,
  }
  const solto = lanc({ id: 's', tipo: 'saida', data: '2026-09-05', valorCentavos: 5000, categoriaId: 'x' })
  const r = calcularRateio([entrada, solto], [...categorias, foraDoRateio], [], '2026-09', 12)
  assert.equal(r.gastosCentavos, 0)
  assert.equal(r.repassadoCentavos, 0)
})
