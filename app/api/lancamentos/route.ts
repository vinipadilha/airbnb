import { NextResponse } from 'next/server'
import { paraLancamento, paraLinhaLancamento, type LinhaLancamento } from '@/lib/mapeamento'
import { clienteServidor } from '@/lib/supabase'
import { validarCorpo } from './validacao'

export async function POST(request: Request) {
  let corpo: unknown
  try {
    corpo = await request.json()
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  const validacao = validarCorpo(corpo)
  if (!validacao.ok) {
    return NextResponse.json({ erro: validacao.erro }, { status: 400 })
  }

  const { data, error } = await clienteServidor()
    .from('lancamentos')
    .insert(paraLinhaLancamento(validacao.valor))
    .select()
    .single()

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json(paraLancamento(data as LinhaLancamento), { status: 201 })
}
