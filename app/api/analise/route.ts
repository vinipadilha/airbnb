import { NextResponse } from 'next/server'
import { resumoAnual, totaisDoAno } from '@/lib/analise'
import { paraLancamento, type LinhaLancamento } from '@/lib/mapeamento'
import { clienteServidor } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ano = Number(searchParams.get('ano'))

  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) {
    return NextResponse.json({ erro: 'Ano inválido.' }, { status: 400 })
  }

  const { data, error } = await clienteServidor()
    .from('lancamentos')
    .select('*')
    .gte('data', `${ano}-01-01`)
    .lte('data', `${ano}-12-31`)

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  const meses = resumoAnual((data as LinhaLancamento[]).map(paraLancamento), ano)

  return NextResponse.json({ ano, meses, totais: totaisDoAno(meses) })
}
