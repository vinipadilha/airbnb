import test from 'node:test'
import assert from 'node:assert/strict'
import { calcularRateio } from './rateio'
import type { Categoria, Lancamento } from './tipos'

const limpeza: Categoria = { id: 'lim', nome: 'Limpeza', cor: '#0ea5e9', arquivada: false, entraNoRateio: true }
const repasse: Categoria = { id: 'rep', nome: 'Repasse', cor: '#64748b', arquivada: false, entraNoRateio: false }
const categorias = [limpeza, repasse]

function lanc(p: Partial<Lancamento> & Pick<Lancamento, 'id' | 'tipo' | 'data' | 'valorCentavos'>): Lancamento {
  return {
    dataFim: null, descricao: '', categoriaId: null, origem: null,
    hospedes: null, criadoEm: '', ...p,
  }
}

const entrada = lanc({ id: 'e', tipo: 'entrada', data: '2026-09-02', valorCentavos: 324158, origem: 'Airbnb' })
const gasto = lanc({ id: 'g', tipo: 'saida', data: '2026-09-20', valorCentavos: 111249, categoriaId: 'lim' })

test('divide o líquido depois de descontar os gastos', () => {
  const r = calcularRateio([entrada, gasto], categorias, '2026-09', 12)
  assert.equal(r.entradasCentavos, 324158)
  assert.equal(r.gastosCentavos, 111249)
  assert.equal(r.liquidoCentavos, 212909)
  assert.equal(r.suaParteCentavos, 25549)
  assert.equal(r.parteDoSocioCentavos, 187360)
})

test('as duas partes somam exatamente o líquido', () => {
  const r = calcularRateio([entrada, gasto], categorias, '2026-09', 12)
  assert.equal(r.suaParteCentavos + r.parteDoSocioCentavos, r.liquidoCentavos)
})

test('nenhum centavo se perde em percentual quebrado', () => {
  const quebrado = lanc({ id: 'q', tipo: 'entrada', data: '2026-09-01', valorCentavos: 10001, origem: 'Airbnb' })
  for (const pct of [12, 33, 50, 7]) {
    const r = calcularRateio([quebrado], categorias, '2026-09', pct)
    assert.equal(r.suaParteCentavos + r.parteDoSocioCentavos, r.liquidoCentavos, `pct ${pct}`)
  }
})

test('o repasse não conta como gasto — senão o rateio fica circular', () => {
  const pago = lanc({ id: 'p', tipo: 'saida', data: '2026-09-25', valorCentavos: 100000, categoriaId: 'rep' })
  const r = calcularRateio([entrada, gasto, pago], categorias, '2026-09', 12)
  // O líquido é o mesmo de antes: o repasse não entrou na conta.
  assert.equal(r.liquidoCentavos, 212909)
  assert.equal(r.gastosCentavos, 111249)
  // Mas conta como já pago.
  assert.equal(r.repassadoCentavos, 100000)
  assert.equal(r.aRepassarCentavos, 187360 - 100000)
})

test('sem repasse nenhum, falta tudo', () => {
  const r = calcularRateio([entrada, gasto], categorias, '2026-09', 12)
  assert.equal(r.repassadoCentavos, 0)
  assert.equal(r.aRepassarCentavos, r.parteDoSocioCentavos)
})

test('repasse a mais deixa o saldo negativo — você adiantou', () => {
  const demais = lanc({ id: 'd', tipo: 'saida', data: '2026-09-25', valorCentavos: 200000, categoriaId: 'rep' })
  const r = calcularRateio([entrada, gasto, demais], categorias, '2026-09', 12)
  assert.equal(r.aRepassarCentavos, 187360 - 200000)
  assert.ok(r.aRepassarCentavos < 0)
})

test('mês no prejuízo divide o prejuízo na mesma proporção', () => {
  const caro = lanc({ id: 'c', tipo: 'saida', data: '2026-09-10', valorCentavos: 500000, categoriaId: 'lim' })
  const r = calcularRateio([entrada, caro], categorias, '2026-09', 12)
  assert.equal(r.liquidoCentavos, 324158 - 500000)
  assert.ok(r.suaParteCentavos < 0)
  assert.ok(r.parteDoSocioCentavos < 0)
  assert.equal(r.suaParteCentavos + r.parteDoSocioCentavos, r.liquidoCentavos)
})

test('mês vazio devolve tudo zerado', () => {
  const r = calcularRateio([], categorias, '2026-07', 12)
  assert.equal(r.liquidoCentavos, 0)
  assert.equal(r.parteDoSocioCentavos, 0)
  assert.equal(r.aRepassarCentavos, 0)
})

test('categoria desconhecida conta como gasto operacional', () => {
  const orfao = lanc({ id: 'o', tipo: 'saida', data: '2026-09-05', valorCentavos: 5000, categoriaId: 'sumiu' })
  const r = calcularRateio([entrada, orfao], categorias, '2026-09', 12)
  assert.equal(r.gastosCentavos, 5000)
})
