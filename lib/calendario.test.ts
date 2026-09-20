import test from 'node:test'
import assert from 'node:assert/strict'
import {
  diasDoMes,
  diariaMediaDoMes,
  noitesDe,
  noitesNoMes,
  ocupacaoDoMes,
  receitaNoMes,
} from './calendario'
import type { Lancamento } from './tipos'

function entrada(
  p: Partial<Lancamento> & Pick<Lancamento, 'id' | 'data' | 'dataFim' | 'valorCentavos'>,
): Lancamento {
  return {
    tipo: 'entrada',
    descricao: 'Reserva',
    categoriaId: null,
    origem: 'Airbnb',
    hospedes: null,
    criadoEm: '',
    ...p,
  }
}

const curta = entrada({ id: 'a', data: '2026-09-10', dataFim: '2026-09-13', valorCentavos: 30000 })
// A reserva real do usuário: 244 noites atravessando 9 meses.
const longa = entrada({ id: 'b', data: '2025-12-21', dataFim: '2026-08-22', valorCentavos: 2710464 })

test('noitesDe conta a diferença entre check-in e check-out', () => {
  assert.equal(noitesDe(curta), 3)
  assert.equal(noitesDe(longa), 244)
})

test('noitesDe de saída é zero', () => {
  const saida: Lancamento = {
    id: 's', tipo: 'saida', data: '2026-09-05', dataFim: null, valorCentavos: 9800,
    descricao: 'Internet', categoriaId: 'c', origem: null, hospedes: null, criadoEm: '',
  }
  assert.equal(noitesDe(saida), 0)
})

test('noitesNoMes conta só as noites que caem no mês', () => {
  assert.equal(noitesNoMes(curta, '2026-09'), 3)
  assert.equal(noitesNoMes(curta, '2026-08'), 0)
})

test('noitesNoMes fatia a reserva longa mês a mês', () => {
  // 21/12 a 31/12 = 11 noites (a noite de 31 conta, o check-out é em agosto).
  assert.equal(noitesNoMes(longa, '2025-12'), 11)
  assert.equal(noitesNoMes(longa, '2026-01'), 31)
  assert.equal(noitesNoMes(longa, '2026-02'), 28)
  // Check-out em 22/08: as noites de 1 a 21 de agosto.
  assert.equal(noitesNoMes(longa, '2026-08'), 21)
  assert.equal(noitesNoMes(longa, '2026-09'), 0)
})

test('a soma das noites por mês bate com o total da reserva', () => {
  const meses = ['2025-12','2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07','2026-08']
  const soma = meses.reduce((t, m) => t + noitesNoMes(longa, m), 0)
  assert.equal(soma, 244)
})

test('reserva que termina no dia seguinte conta uma noite', () => {
  const umaNoite = entrada({ id: 'c', data: '2026-09-30', dataFim: '2026-10-01', valorCentavos: 12000 })
  assert.equal(noitesNoMes(umaNoite, '2026-09'), 1)
  assert.equal(noitesNoMes(umaNoite, '2026-10'), 0)
})

test('receitaNoMes rateia proporcionalmente às noites', () => {
  assert.equal(receitaNoMes(curta, '2026-09'), 30000)
  // 2710464 / 244 = 11108 por noite, com 112 centavos de sobra distribuídos
  // uma a uma nas primeiras 112 noites. As 11 de dezembro estão entre elas.
  assert.equal(receitaNoMes(longa, '2025-12'), 11109 * 11)
})

test('receitaNoMes não perde nem inventa um centavo sequer', () => {
  const meses = ['2025-12','2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07','2026-08']
  const soma = meses.reduce((t, m) => t + receitaNoMes(longa, m), 0)
  assert.equal(soma, longa.valorCentavos)
})

test('o rateio fecha mesmo quando a divisão não é exata', () => {
  // 100,00 em 3 noites: 33,34 + 33,33 + 33,33.
  const tres = entrada({ id: 'd', data: '2026-09-29', dataFim: '2026-10-02', valorCentavos: 10000 })
  assert.equal(receitaNoMes(tres, '2026-09') + receitaNoMes(tres, '2026-10'), 10000)
  assert.equal(receitaNoMes(tres, '2026-09'), 3334 + 3333)
})

test('diasDoMes marca cada dia como ocupado ou livre', () => {
  const dias = diasDoMes([curta], '2026-09')
  assert.equal(dias.length, 30)
  assert.equal(dias[0].data, '2026-09-01')
  assert.equal(dias[0].ocupado, false)
  // Noites de 10, 11 e 12; o dia 13 é check-out, então já está livre.
  assert.equal(dias[9].ocupado, true)
  assert.equal(dias[11].ocupado, true)
  assert.equal(dias[12].ocupado, false)
})

test('diasDoMes marca check-in e check-out para desenhar as pontas', () => {
  const dias = diasDoMes([curta], '2026-09')
  assert.equal(dias[9].checkIn, true)
  assert.equal(dias[10].checkIn, false)
  assert.equal(dias[12].checkOut, true)
})

test('diasDoMes cobre o mês inteiro numa estadia longa', () => {
  const dias = diasDoMes([longa], '2026-03')
  assert.equal(dias.every((d) => d.ocupado), true)
  assert.equal(dias.some((d) => d.checkIn), false)
})

test('ocupacaoDoMes devolve noites, dias e percentual', () => {
  assert.deepEqual(ocupacaoDoMes([curta], '2026-09'), {
    noitesOcupadas: 3,
    diasNoMes: 30,
    percentual: 10,
  })
})

test('ocupacaoDoMes chega a 100 por cento num mês cheio', () => {
  const r = ocupacaoDoMes([longa], '2026-03')
  assert.equal(r.noitesOcupadas, 31)
  assert.equal(r.percentual, 100)
})

test('ocupacaoDoMes de mês vazio é zero', () => {
  assert.deepEqual(ocupacaoDoMes([], '2026-07'), {
    noitesOcupadas: 0,
    diasNoMes: 31,
    percentual: 0,
  })
})

test('diariaMediaDoMes divide a receita pelas noites do mês', () => {
  assert.equal(diariaMediaDoMes([curta], '2026-09'), 10000)
})

test('diariaMediaDoMes é zero quando não houve noite', () => {
  assert.equal(diariaMediaDoMes([], '2026-07'), 0)
})
