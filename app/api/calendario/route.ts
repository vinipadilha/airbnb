import { NextResponse } from 'next/server'
import { diariaMediaDoMes, noitesDe, ocupacaoDoMes } from '@/lib/calendario'
import { competenciaDe } from '@/lib/competencia'
import { carregarConfiguracoes } from '@/lib/configuracoes'
import { paraLancamento, type LinhaLancamento } from '@/lib/mapeamento'
import { clienteServidor } from '@/lib/supabase'
import { totaisDoMes } from '@/lib/totais'

/**
 * Reservas que ocupam alguma noite do mês.
 *
 * Diferente de /api/mes, que filtra pela data do pagamento: aqui o critério é
 * a estadia. Uma reserva de 28/09 a 05/10 é paga em setembro, mas ocupa os
 * primeiros dias de outubro e precisa aparecer no calendário de outubro.
 */
export async function GET(request: Request) {
  const competencia = new URL(request.url).searchParams.get('competencia') ?? ''
  if (!/^\d{4}-\d{2}$/.test(competencia)) {
    return NextResponse.json({ erro: 'Competência inválida.' }, { status: 400 })
  }

  const supabase = clienteServidor()
  // Busca tudo: os indicadores misturam dois critérios — faturamento pela data
  // do pagamento, ocupação pela estadia —, e uma reserva entra num e não no
  // outro na virada do mês. Com poucas centenas de linhas, custa nada.
  const [lancamentosRes, categoriasRes, config] = await Promise.all([
    supabase.from('lancamentos').select('*').order('data'),
    supabase.from('categorias').select('*').order('nome'),
    carregarConfiguracoes(),
  ])

  if (lancamentosRes.error) {
    return NextResponse.json({ erro: lancamentosRes.error.message }, { status: 500 })
  }

  const todos = (lancamentosRes.data as LinhaLancamento[]).map(paraLancamento)
  const inicio = `${competencia}-01`
  const fimDoMes = `${competencia}-31`

  // Reservas com alguma noite no mês: é o que o calendário desenha.
  const reservas = todos.filter(
    (l) =>
      l.tipo === 'entrada' &&
      noitesDe(l) > 0 &&
      l.data <= fimDoMes &&
      (l.dataFim as string) > inicio,
  )

  const totais = totaisDoMes(todos, competencia)
  const categorias = (categoriasRes.data ?? []).map((c: Record<string, unknown>) => ({
    id: c.id as string,
    nome: c.nome as string,
    cor: c.cor as string,
    arquivada: c.arquivada as boolean,
    entraNoRateio: c.entra_no_rateio !== false,
  }))

  return NextResponse.json({
    competencia,
    reservas,
    ocupacao: ocupacaoDoMes(reservas, competencia),
    // Faturamento em regime de caixa, igual ao Resumo: o que cai neste mês.
    faturamento: {
      recebidoCentavos: totais.entradas,
      programadoCentavos: totais.entradasProgramadas,
      estimadoCentavos: totais.entradasEstimadas,
    },
    // Diária média pelas noites do mês, rateando cada estadia por noite —
    // é a métrica de diária que o PriceLabs usa.
    diariaMediaCentavos: diariaMediaDoMes(todos, competencia),
    checkInsNoMes: todos.filter(
      (l) => l.tipo === 'entrada' && noitesDe(l) > 0 && competenciaDe(l.data) === competencia,
    ).length,
    categorias,
    configuracoes: config,
  })
}
