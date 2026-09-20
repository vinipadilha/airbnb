import { NextResponse } from 'next/server'
import { clienteServidor } from '@/lib/supabase'
import type { Repasse } from '@/lib/tipos'

type LinhaRepasse = {
  id: string
  data: string
  valor_centavos: number
  observacao: string
}

function paraRepasse(l: LinhaRepasse): Repasse {
  return {
    id: l.id,
    data: l.data,
    valorCentavos: l.valor_centavos,
    observacao: l.observacao,
  }
}

export async function GET() {
  const { data, error } = await clienteServidor()
    .from('repasses')
    .select('id, data, valor_centavos, observacao')
    .order('data', { ascending: false })

  // Sem a migração 004 a tabela não existe; devolver vazio mantém o app de pé.
  if (error) return NextResponse.json([])

  return NextResponse.json((data as LinhaRepasse[]).map(paraRepasse))
}

export async function POST(request: Request) {
  let corpo: Record<string, unknown>
  try {
    corpo = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  if (typeof corpo.data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(corpo.data)) {
    return NextResponse.json({ erro: 'Data inválida.' }, { status: 400 })
  }
  if (!Number.isInteger(corpo.valorCentavos) || (corpo.valorCentavos as number) <= 0) {
    return NextResponse.json({ erro: 'Valor precisa ser maior que zero.' }, { status: 400 })
  }

  const { data, error } = await clienteServidor()
    .from('repasses')
    .insert({
      data: corpo.data,
      valor_centavos: corpo.valorCentavos,
      observacao: typeof corpo.observacao === 'string' ? corpo.observacao.trim() : '',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json(paraRepasse(data as LinhaRepasse), { status: 201 })
}
