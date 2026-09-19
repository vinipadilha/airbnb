import test from 'node:test'
import assert from 'node:assert/strict'
import { formatCentavos, parseValorBRL } from './dinheiro'

test('parseValorBRL aceita formato pt-BR com milhar e decimal', () => {
  assert.equal(parseValorBRL('1.234,56'), 123456)
  assert.equal(parseValorBRL('98,00'), 9800)
  assert.equal(parseValorBRL('0,05'), 5)
})

test('parseValorBRL aceita formato com ponto decimal', () => {
  assert.equal(parseValorBRL('1234.56'), 123456)
  assert.equal(parseValorBRL('98.5'), 9850)
})

test('parseValorBRL aceita inteiro sem decimal', () => {
  assert.equal(parseValorBRL('98'), 9800)
  assert.equal(parseValorBRL('1.234'), 123400)
})

test('parseValorBRL ignora prefixo e espaços', () => {
  assert.equal(parseValorBRL(' R$ 1.234,56 '), 123456)
  assert.equal(parseValorBRL('R$98,00'), 9800)
})

test('parseValorBRL arredonda centavos extras', () => {
  assert.equal(parseValorBRL('10,555'), 1056)
})

test('parseValorBRL rejeita o que não é número', () => {
  assert.equal(parseValorBRL(''), null)
  assert.equal(parseValorBRL('   '), null)
  assert.equal(parseValorBRL('abc'), null)
  assert.equal(parseValorBRL('R$'), null)
  assert.equal(parseValorBRL('12,34,56'), null)
})

test('parseValorBRL rejeita zero e negativo', () => {
  assert.equal(parseValorBRL('0'), null)
  assert.equal(parseValorBRL('0,00'), null)
  assert.equal(parseValorBRL('-50,00'), null)
})

test('formatCentavos devolve moeda pt-BR', () => {
  //   é espaço inquebrável: é o que o Intl pt-BR/BRL emite entre "R$" e os
  // dígitos. Escrever um espaço comum aqui faz o teste falhar de um jeito que
  // não aparece no diff, porque os dois caracteres são visualmente idênticos.
  assert.equal(formatCentavos(123456), 'R$ 1.234,56')
  assert.equal(formatCentavos(9800), 'R$ 98,00')
  assert.equal(formatCentavos(0), 'R$ 0,00')
})

test('formatCentavos preserva o sinal', () => {
  assert.equal(formatCentavos(-9800), '-R$ 98,00')
})
