import test from 'node:test'
import assert from 'node:assert/strict'
import { gastosPendentes } from './pendencias'
import type { GastoFixo, GastoFixoLancado } from './tipos'

function fixo(p: Partial<GastoFixo> & Pick<GastoFixo, 'id' | 'nome'>): GastoFixo {
  return {
    valorReferenciaCentavos: 9800,
    categoriaId: 'fixas',
    arquivada: false,
    competenciaInicial: '2026-01',
    pagoPor: 'voce',
    ...p,
  }
}

const internet = fixo({ id: 'net', nome: 'Internet' })
const pricelabs = fixo({ id: 'pl', nome: 'PriceLabs', valorReferenciaCentavos: 11000 })

test('todos pendentes quando nada foi lançado', () => {
  const r = gastosPendentes([internet, pricelabs], [], '2026-09')
  assert.deepEqual(r.map((g) => g.id), ['net', 'pl'])
})

test('gasto já lançado no mês sai da fila', () => {
  const lancados: GastoFixoLancado[] = [
    { gastoFixoId: 'net', competencia: '2026-09', lancamentoId: 'l1' },
  ]
  const r = gastosPendentes([internet, pricelabs], lancados, '2026-09')
  assert.deepEqual(r.map((g) => g.id), ['pl'])
})

test('lançamento em outro mês não tira da fila do mês corrente', () => {
  const lancados: GastoFixoLancado[] = [
    { gastoFixoId: 'net', competencia: '2026-08', lancamentoId: 'l1' },
  ]
  const r = gastosPendentes([internet], lancados, '2026-09')
  assert.deepEqual(r.map((g) => g.id), ['net'])
})

test('gasto arquivado nunca é pendente', () => {
  const morto = fixo({ id: 'x', nome: 'Antigo', arquivada: true })
  assert.deepEqual(gastosPendentes([morto], [], '2026-09'), [])
})

test('gasto criado depois do mês não gera pendência retroativa', () => {
  const novo = fixo({ id: 'novo', nome: 'Novo', competenciaInicial: '2026-09' })
  assert.deepEqual(gastosPendentes([novo], [], '2026-08'), [])
  assert.deepEqual(gastosPendentes([novo], [], '2026-09').map((g) => g.id), ['novo'])
  assert.deepEqual(gastosPendentes([novo], [], '2026-10').map((g) => g.id), ['novo'])
})

test('preserva a ordem recebida', () => {
  const r = gastosPendentes([pricelabs, internet], [], '2026-09')
  assert.deepEqual(r.map((g) => g.id), ['pl', 'net'])
})
