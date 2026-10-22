import { NextResponse } from 'next/server'
import { ocupacaoAnual, resumoAnual, totaisDoAno } from '@/lib/analise'
import { paraLancamento, type LinhaLancamento } from '@/lib/mapeamento'
import { clienteServidor } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ano = Number(searchParams.get('ano'))

  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) {
    return NextResponse.json({ erro: 'Ano inválido.' }, { status: 400 })
  }

  // Busca tudo e deixa as funções puras filtrarem. Filtrar aqui pela data do
  // check-in perdia a reserva de 31/12: paga em 01/01, ela não pertence ao
  // ano do check-in e a busca do ano seguinte não a encontrava — sumia dos
  // dois. Com poucas centenas de linhas, buscar tudo custa nada.
  const { data, error } = await clienteServidor().from('lancamentos').select('*')

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  const lancamentos = (data as LinhaLancamento[]).map(paraLancamento)
  const meses = resumoAnual(lancamentos, ano)

  return NextResponse.json({
    ano,
    meses,
    totais: totaisDoAno(meses),
    ocupacao: ocupacaoAnual(lancamentos, ano),
  })
}
