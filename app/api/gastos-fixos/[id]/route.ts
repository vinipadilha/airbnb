import { NextResponse } from 'next/server'
import { clienteServidor } from '@/lib/supabase'

type Contexto = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Contexto) {
  const { id } = await params
  const corpo = (await request.json()) as Record<string, unknown>

  const mudancas: Record<string, unknown> = {}
  if (typeof corpo.nome === 'string' && corpo.nome.trim() !== '') {
    mudancas.nome = corpo.nome.trim()
  }
  if (Number.isInteger(corpo.valorReferenciaCentavos) && (corpo.valorReferenciaCentavos as number) > 0) {
    mudancas.valor_referencia_centavos = corpo.valorReferenciaCentavos
  }
  if (typeof corpo.categoriaId === 'string') {
    mudancas.categoria_id = corpo.categoriaId
  }

  if (Object.keys(mudancas).length === 0) {
    return NextResponse.json({ erro: 'Nada para alterar.' }, { status: 400 })
  }

  const { error } = await clienteServidor().from('gastos_fixos').update(mudancas).eq('id', id)
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}

export async function DELETE(_request: Request, { params }: Contexto) {
  const { id } = await params

  // Spec §4: "remover" é arquivar. Apagar de verdade derrubaria, por cascade,
  // o controle de idempotência e reabriria meses já quitados.
  const { error } = await clienteServidor()
    .from('gastos_fixos')
    .update({ arquivada: true })
    .eq('id', id)

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
