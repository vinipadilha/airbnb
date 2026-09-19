import test from 'node:test'
import assert from 'node:assert/strict'
import { assinarToken, comparaSegura, verificarToken } from './sessao'

const SEGREDO = 'segredo-de-teste-nao-usar-em-producao'
const DAQUI_A_UM_DIA = Date.now() + 86_400_000

test('token recém-assinado é válido', async () => {
  const token = await assinarToken(DAQUI_A_UM_DIA, SEGREDO)
  assert.equal(await verificarToken(token, SEGREDO), true)
})

test('token expirado é rejeitado', async () => {
  const token = await assinarToken(Date.now() - 1000, SEGREDO)
  assert.equal(await verificarToken(token, SEGREDO), false)
})

test('token assinado com outro segredo é rejeitado', async () => {
  const token = await assinarToken(DAQUI_A_UM_DIA, SEGREDO)
  assert.equal(await verificarToken(token, 'outro-segredo'), false)
})

test('token com payload adulterado é rejeitado', async () => {
  // O atacante estende a validade mas não sabe reassinar.
  const token = await assinarToken(Date.now() - 1000, SEGREDO)
  const assinatura = token.split('.')[1]
  const forjado = `${Date.now() + 999_999}.${assinatura}`
  assert.equal(await verificarToken(forjado, SEGREDO), false)
})

test('valores que não são token são rejeitados sem lançar', async () => {
  for (const lixo of ['', '1', 'a.b.c', 'abc.def', '.', 'auth=1']) {
    assert.equal(await verificarToken(lixo, SEGREDO), false, `falhou em "${lixo}"`)
  }
})

test('comparaSegura compara conteúdo, não referência', () => {
  assert.equal(comparaSegura('123456', '123456'), true)
  assert.equal(comparaSegura('123456', '123457'), false)
  assert.equal(comparaSegura('123456', '12345'), false)
  assert.equal(comparaSegura('', ''), true)
})
