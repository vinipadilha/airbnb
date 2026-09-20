import { NextResponse } from 'next/server'
import { clienteServidor } from '@/lib/supabase'

type Contexto = { params: Promise<{ id: string }> }

export async function DELETE(_request: Request, { params }: Contexto) {
  const { id } = await params

  const { error } = await clienteServidor().from('repasses').delete().eq('id', id)

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
