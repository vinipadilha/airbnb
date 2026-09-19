import { NextResponse } from 'next/server'
import { competenciaDe } from '@/lib/competencia'
import { paraLancamento, paraLinhaLancamento, type LinhaLancamento } from '@/lib/mapeamento'
import { clienteServidor } from '@/lib/supabase'
import { validarCorpo } from '../validacao'

type Contexto = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Contexto) {
  const { id } = await params

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

  const supabase = clienteServidor()

  // Spec §6: lançamento gerado pela fila não pode mudar de mês, senão a linha
  // de controle apontaria para um mês onde a despesa não está mais.
  const { data: controle } = await supabase
    .from('gastos_fixos_lancados')
    .select('competencia')
    .eq('lancamento_id', id)
    .maybeSingle()

  if (controle && competenciaDe(validacao.valor.data) !== controle.competencia) {
    return NextResponse.json(
      {
        erro:
          'Este lançamento veio da lista de gastos fixos e não pode mudar de mês. ' +
          'Para movê-lo, exclua e lance de novo.',
      },
      { status: 409 },
    )
  }

  const { data, error } = await supabase
    .from('lancamentos')
    .update(paraLinhaLancamento(validacao.valor))
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json(paraLancamento(data as LinhaLancamento))
}

export async function DELETE(_request: Request, { params }: Contexto) {
  const { id } = await params

  // A linha em gastos_fixos_lancados cai junto por ON DELETE CASCADE, o que
  // devolve o gasto fixo para a fila de pendências do mês.
  const { error } = await clienteServidor().from('lancamentos').delete().eq('id', id)

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
