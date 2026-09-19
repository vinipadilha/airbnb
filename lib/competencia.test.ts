import test from 'node:test'
import assert from 'node:assert/strict'
import {
  competenciaAtual,
  competenciaDe,
  deslocarCompetencia,
  hojeEmSaoPaulo,
  rotuloCompetencia,
} from './competencia'

test('competenciaDe extrai YYYY-MM da data', () => {
  assert.equal(competenciaDe('2026-09-18'), '2026-09')
  assert.equal(competenciaDe('2025-01-01'), '2025-01')
  assert.equal(competenciaDe('2026-12-31'), '2026-12')
})

test('hojeEmSaoPaulo usa o fuso local, não UTC', () => {
  // 01/10 às 01:00 UTC ainda é 30/09 em São Paulo (UTC-3).
  const instante = new Date('2026-10-01T01:00:00Z')
  assert.equal(hojeEmSaoPaulo(instante), '2026-09-30')
})

test('hojeEmSaoPaulo no meio do dia', () => {
  assert.equal(hojeEmSaoPaulo(new Date('2026-09-18T15:00:00Z')), '2026-09-18')
})

test('competenciaAtual usa o fuso local', () => {
  assert.equal(competenciaAtual(new Date('2026-10-01T01:00:00Z')), '2026-09')
})

test('deslocarCompetencia anda para frente e para trás', () => {
  assert.equal(deslocarCompetencia('2026-09', 1), '2026-10')
  assert.equal(deslocarCompetencia('2026-09', -1), '2026-08')
})

test('deslocarCompetencia atravessa a virada de ano', () => {
  assert.equal(deslocarCompetencia('2026-12', 1), '2027-01')
  assert.equal(deslocarCompetencia('2026-01', -1), '2025-12')
  assert.equal(deslocarCompetencia('2026-01', -13), '2024-12')
})

test('rotuloCompetencia devolve mês por extenso em português', () => {
  assert.equal(rotuloCompetencia('2026-09'), 'setembro 2026')
  assert.equal(rotuloCompetencia('2025-01'), 'janeiro 2025')
})
