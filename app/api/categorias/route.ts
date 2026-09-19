import { NextResponse } from 'next/server'
import { clienteServidor } from '@/lib/supabase'

const CORES = ['#38bdf8', '#fb923c', '#a78bfa', '#34d399', '#f472b6', '#facc15']

export async function POST(request: Request) {
  const corpo = (await request.json()) as { nome?: unknown }

  if (typeof corpo.nome !== 'string' || corpo.nome.trim() === '') {
    return NextResponse.json({ erro: 'Informe o nome.' }, { status: 400 })
  }

  const supabase = clienteServidor()
  const { count } = await supabase.from('categorias').select('*', { count: 'exact', head: true })

  const { data, error } = await supabase
    .from('categorias')
    .insert({ nome: corpo.nome.trim(), cor: CORES[(count ?? 0) % CORES.length] })
    .select()
    .single()

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
