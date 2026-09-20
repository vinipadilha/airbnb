import test from 'node:test'
import assert from 'node:assert/strict'
import { resumoAnual } from './analise'
import type { Lancamento } from './tipos'

function lanc(p: Partial<Lancamento> & Pick<Lancamento, 'id' | 'tipo' | 'data' | 'valorCentavos'>): Lancamento {
  return {
    dataFim: null, descricao: '', categoriaId: null, origem: null,
    hospedes: null, recebido: true, criadoEm: '', ...p,
  }
}

const lancamentos: Lancamento[] = [
  lanc({ id: '1', tipo: 'entrada', data: '2026-09-02', valorCentavos: 213742, origem: 'Airbnb' }),
  lanc({ id: '2', tipo: 'entrada', data: '2026-09-21', valorCentavos: 154580, origem: 'Airbnb', recebido: false }),
  lanc({ id: '3', tipo: 'saida', data: '2026-09-20', valorCentavos: 112886, categoriaId: 'c' }),
  lanc({ id: '4', tipo: 'entrada', data: '2026-03-10', valorCentavos: 300000, origem: 'Airbnb' }),
  lanc({ id: '5', tipo: 'entrada', data: '2025-12-10', valorCentavos: 999900, origem: 'Airbnb' }),
]

test('devolve os doze meses do ano, em ordem', () => {
  const r = resumoAnual(lancamentos, 2026)
  assert.equal(r.length, 12)
  assert.equal(r[0].competencia, '2026-01')
  assert.equal(r[11].competencia, '2026-12')
})

test('separa recebido de programado', () => {
  const setembro = resumoAnual(lancamentos, 2026)[8]
  assert.equal(setembro.competencia, '2026-09')
  assert.equal(setembro.recebidoCentavos, 213742)
  assert.equal(setembro.programadoCentavos, 154580)
  assert.equal(setembro.totalCentavos, 213742 + 154580)
})

test('saldo do mês desconta os gastos só do que foi recebido', () => {
  const setembro = resumoAnual(lancamentos, 2026)[8]
  assert.equal(setembro.saidasCentavos, 112886)
  assert.equal(setembro.saldoCentavos, 213742 - 112886)
})

test('mês sem movimento vem zerado, não ausente', () => {
  const fevereiro = resumoAnual(lancamentos, 2026)[1]
  assert.equal(fevereiro.competencia, '2026-02')
  assert.equal(fevereiro.recebidoCentavos, 0)
  assert.equal(fevereiro.programadoCentavos, 0)
  assert.equal(fevereiro.saidasCentavos, 0)
  assert.equal(fevereiro.saldoCentavos, 0)
})

test('ignora lançamento de outro ano', () => {
  const r = resumoAnual(lancamentos, 2026)
  const total = r.reduce((t, m) => t + m.totalCentavos, 0)
  assert.equal(total, 213742 + 154580 + 300000)
})

test('março aparece no lugar certo', () => {
  const marco = resumoAnual(lancamentos, 2026)[2]
  assert.equal(marco.competencia, '2026-03')
  assert.equal(marco.recebidoCentavos, 300000)
})

test('ano sem nenhum lançamento devolve doze meses zerados', () => {
  const r = resumoAnual(lancamentos, 2024)
  assert.equal(r.length, 12)
  assert.equal(r.every((m) => m.totalCentavos === 0 && m.saidasCentavos === 0), true)
})

test('rótulo curto do mês para o eixo do gráfico', () => {
  const r = resumoAnual([], 2026)
  assert.equal(r[0].rotulo, 'jan')
  assert.equal(r[8].rotulo, 'set')
  assert.equal(r[11].rotulo, 'dez')
})
