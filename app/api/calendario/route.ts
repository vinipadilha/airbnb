import { NextResponse } from 'next/server'
import { diasNaCompetencia, ocupacaoDoMes, somarDias } from '@/lib/calendario'
import { carregarConfiguracoes } from '@/lib/configuracoes'
import { paraLancamento, type LinhaLancamento } from '@/lib/mapeamento'
import { clienteServidor } from '@/lib/supabase'

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

  const inicio = `${competencia}-01`
  const depoisDoFim = somarDias(
    `${competencia}-${String(diasNaCompetencia(competencia)).padStart(2, '0')}`,
    1,
  )

  const supabase = clienteServidor()
  const [reservasRes, categoriasRes, config] = await Promise.all([
    supabase
      .from('lancamentos')
      .select('*')
      .eq('tipo', 'entrada')
      .not('data_fim', 'is', null)
      .lt('data', depoisDoFim)
      .gt('data_fim', inicio)
      .order('data'),
    supabase.from('categorias').select('*').order('nome'),
    carregarConfiguracoes(),
  ])

  if (reservasRes.error) {
    return NextResponse.json({ erro: reservasRes.error.message }, { status: 500 })
  }

  const reservas = (reservasRes.data as LinhaLancamento[]).map(paraLancamento)
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
    categorias,
    configuracoes: config,
  })
}
