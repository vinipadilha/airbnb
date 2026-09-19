import { NextResponse } from 'next/server'
import { clienteServidor } from '@/lib/supabase'

type Contexto = { params: Promise<{ id: string }> }

export async function DELETE(_request: Request, { params }: Contexto) {
  const { id } = await params

  // Spec §4: arquivar, não apagar. Apagar quebraria a FK dos lançamentos
  // antigos e deixaria o histórico sem classificação.
  const { error } = await clienteServidor()
    .from('categorias')
    .update({ arquivada: true })
    .eq('id', id)

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
