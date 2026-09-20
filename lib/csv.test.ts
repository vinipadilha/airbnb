import test from 'node:test'
import assert from 'node:assert/strict'
import { marcarDuplicados, parseCsvEntradas } from './csv'
import type { Lancamento } from './tipos'

test('lê CSV com vírgula e data ISO', () => {
  const r = parseCsvEntradas('data,valor,descricao\n2026-09-03,500.00,Reserva 3 noites')
  assert.equal(r.length, 1)
  assert.deepEqual(r[0], {
    linha: 2,
    data: '2026-09-03',
    valorCentavos: 50000,
    descricao: 'Reserva 3 noites',
    noites: null,
    hospedes: null,
    erro: null,
  })
})

test('lê CSV do Excel pt-BR com ponto e vírgula', () => {
  const r = parseCsvEntradas('data;valor;descricao\n03/09/2026;1.234,56;Reserva')
  assert.equal(r[0].data, '2026-09-03')
  assert.equal(r[0].valorCentavos, 123456)
  assert.equal(r[0].erro, null)
})

test('aceita cabeçalho fora de ordem, com acento e maiúscula', () => {
  const r = parseCsvEntradas('Descrição;Valor;Data\nReserva;98,00;01/01/2025')
  assert.equal(r[0].descricao, 'Reserva')
  assert.equal(r[0].valorCentavos, 9800)
  assert.equal(r[0].data, '2025-01-01')
})

test('lê noites e hospedes quando presentes', () => {
  const r = parseCsvEntradas('data,valor,descricao,noites,hospedes\n2026-09-03,500,R,3,2')
  assert.equal(r[0].noites, 3)
  assert.equal(r[0].hospedes, 2)
})

test('noites e hospedes inválidos viram null sem invalidar a linha', () => {
  const r = parseCsvEntradas('data,valor,descricao,noites,hospedes\n2026-09-03,500,R,abc,0')
  assert.equal(r[0].erro, null)
  assert.equal(r[0].noites, null)
  assert.equal(r[0].hospedes, null)
})

test('marca linha com data ilegível sem derrubar as outras', () => {
  const texto = [
    'data,valor,descricao',
    '2026-09-03,500,Boa',
    '32/13/2026,500,Ruim',
    '2026-09-05,600,Boa2',
  ].join('\n')
  const r = parseCsvEntradas(texto)
  assert.equal(r.length, 3)
  assert.equal(r[0].erro, null)
  assert.match(r[1].erro ?? '', /data/i)
  assert.equal(r[2].erro, null)
})

test('marca valor não numérico e valor não positivo', () => {
  const r = parseCsvEntradas('data,valor,descricao\n2026-09-03,abc,X\n2026-09-04,0,Y')
  assert.match(r[0].erro ?? '', /valor/i)
  assert.match(r[1].erro ?? '', /valor/i)
})

test('ignora linhas em branco', () => {
  const r = parseCsvEntradas('data,valor,descricao\n\n2026-09-03,500,R\n\n')
  assert.equal(r.length, 1)
})

test('o número da linha é o do arquivo, mesmo com linhas em branco', () => {
  // Linha 1 = cabeçalho, 2 = vazia, 3 = boa, 4 = ruim.
  const texto = 'data,valor,descricao\n\n2026-09-03,500,Boa\n32/13/2026,500,Ruim'
  const r = parseCsvEntradas(texto)
  assert.equal(r[0].linha, 3)
  assert.equal(r[1].linha, 4)
})

test('respeita aspas em campo que contém o separador', () => {
  const r = parseCsvEntradas('data,valor,descricao\n2026-09-03,500,"Reserva, 3 noites"')
  assert.equal(r[0].descricao, 'Reserva, 3 noites')
  assert.equal(r[0].erro, null)
})

test('aspas duplicadas viram uma aspa literal', () => {
  const linha = 'data;valor;descricao\n03/09/2026;500;"Studio ""Alto da Gloria"""'
  const r = parseCsvEntradas(linha)
  assert.equal(r[0].descricao, 'Studio "Alto da Gloria"')
})

test('cabeçalho entre aspas é reconhecido', () => {
  const r = parseCsvEntradas('"data","valor","descricao"\n2026-09-03,500,R')
  assert.equal(r[0].valorCentavos, 50000)
  assert.equal(r[0].erro, null)
})

test('lança quando o cabeçalho não tem as colunas obrigatórias', () => {
  assert.throws(() => parseCsvEntradas('a,b,c\n1,2,3'), /cabeçalho/i)
})

test('lança quando o texto está vazio', () => {
  assert.throws(() => parseCsvEntradas('   '), /vazio/i)
})

test('marcarDuplicados acusa linha já existente no banco', () => {
  const existentes = [
    {
      id: '1', tipo: 'entrada', data: '2026-09-03', dataFim: null,
      valorCentavos: 50000, descricao: 'R', categoriaId: null, origem: 'Airbnb',
      hospedes: null, criadoEm: '',
    } satisfies Lancamento,
  ]
  const linhas = parseCsvEntradas('data,valor,descricao\n2026-09-03,500,Outra descrição')
  const r = marcarDuplicados(linhas, existentes)
  assert.equal(r[0].duplicada, true)
})

test('marcarDuplicados acusa repetição dentro do próprio arquivo', () => {
  const linhas = parseCsvEntradas(
    'data,valor,descricao\n2026-09-03,500,A\n2026-09-03,500,B\n2026-09-04,500,C',
  )
  const r = marcarDuplicados(linhas, [])
  assert.equal(r[0].duplicada, false)
  assert.equal(r[1].duplicada, true)
  assert.equal(r[2].duplicada, false)
})

test('marcarDuplicados não marca linha com erro', () => {
  const linhas = parseCsvEntradas('data,valor,descricao\n2026-09-03,abc,A')
  const r = marcarDuplicados(linhas, [])
  assert.equal(r[0].duplicada, false)
})
