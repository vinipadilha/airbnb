import { NextResponse } from 'next/server'
import { competenciaAtual } from '@/lib/competencia'
import { paraGastoFixo, type LinhaGastoFixo } from '@/lib/mapeamento'
import { clienteServidor } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await clienteServidor()
    .from('gastos_fixos')
    .select('*')
    .eq('arquivada', false)
    .order('nome')

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json((data as LinhaGastoFixo[]).map(paraGastoFixo))
}

export async function POST(request: Request) {
  const corpo = (await request.json()) as Record<string, unknown>

  if (typeof corpo.nome !== 'string' || corpo.nome.trim() === '') {
    return NextResponse.json({ erro: 'Informe o nome.' }, { status: 400 })
  }
  if (!Number.isInteger(corpo.valorReferenciaCentavos) || (corpo.valorReferenciaCentavos as number) <= 0) {
    return NextResponse.json({ erro: 'Valor precisa ser maior que zero.' }, { status: 400 })
  }
  if (typeof corpo.categoriaId !== 'string') {
    return NextResponse.json({ erro: 'Escolha uma categoria.' }, { status: 400 })
  }

  const { data, error } = await clienteServidor()
    .from('gastos_fixos')
    .insert({
      nome: corpo.nome.trim(),
      valor_referencia_centavos: corpo.valorReferenciaCentavos,
      categoria_id: corpo.categoriaId,
      // Spec §5: passa a gerar pendência a partir deste mês, nunca retroativo.
      // Calculado no servidor com o fuso do usuário, não pelo relógio do banco.
      competencia_inicial: competenciaAtual(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json(paraGastoFixo(data as LinhaGastoFixo), { status: 201 })
}
