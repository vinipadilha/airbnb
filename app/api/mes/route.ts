import { NextResponse } from 'next/server'
import { competenciaAtual, competenciaDe } from '@/lib/competencia'
import { paraLancamento, type LinhaLancamento } from '@/lib/mapeamento'
import { clienteServidor } from '@/lib/supabase'
import { saidasPorCategoria, saldoAcumulado, totaisDoMes } from '@/lib/totais'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const competencia = searchParams.get('competencia') ?? competenciaAtual()

  if (!/^\d{4}-\d{2}$/.test(competencia)) {
    return NextResponse.json({ erro: 'Competência inválida.' }, { status: 400 })
  }

  const supabase = clienteServidor()

  const [lancamentosRes, categoriasRes] = await Promise.all([
    supabase.from('lancamentos').select('*').order('data', { ascending: false }).order('criado_em', { ascending: false }),
    supabase.from('categorias').select('*').order('nome'),
  ])

  if (lancamentosRes.error || categoriasRes.error) {
    return NextResponse.json(
      { erro: lancamentosRes.error?.message ?? categoriasRes.error?.message },
      { status: 500 },
    )
  }

  const todos = (lancamentosRes.data as LinhaLancamento[]).map(paraLancamento)

  return NextResponse.json({
    competencia,
    lancamentos: todos.filter((l) => competenciaDe(l.data) === competencia),
    totais: totaisDoMes(todos, competencia),
    saldoTotalCentavos: saldoAcumulado(todos),
    porCategoria: saidasPorCategoria(todos, competencia),
    categorias: categoriasRes.data,
  })
}
