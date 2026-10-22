import test from 'node:test'
import assert from 'node:assert/strict'
import { ehTema, resolveEscuro } from './tema'

test('escuro é sempre escuro, claro é sempre claro', () => {
  assert.equal(resolveEscuro('escuro', false), true)
  assert.equal(resolveEscuro('escuro', true), true)
  assert.equal(resolveEscuro('claro', false), false)
  assert.equal(resolveEscuro('claro', true), false)
})

test('sistema segue a preferência do aparelho', () => {
  assert.equal(resolveEscuro('sistema', true), true)
  assert.equal(resolveEscuro('sistema', false), false)
})

test('ehTema aceita só os três valores', () => {
  assert.equal(ehTema('claro'), true)
  assert.equal(ehTema('escuro'), true)
  assert.equal(ehTema('sistema'), true)
  assert.equal(ehTema('noturno'), false)
  assert.equal(ehTema(null), false)
  assert.equal(ehTema(undefined), false)
})
