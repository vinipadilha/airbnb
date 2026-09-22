import { NextResponse } from 'next/server'
import { competenciaAtual, competenciaDe } from '@/lib/competencia'
import { gastosPendentes } from '@/lib/pendencias'
import { clienteServidor } from '@/lib/supabase'
import { paraGastoFixo } from '@/lib/mapeamento'
import type { GastoFixo, GastoFixoLancado } from '@/lib/tipos'

async function carregarPendentes(competencia: string): Promise<GastoFixo[]> {
  const supabase = clienteServidor()

  const [fixosRes, lancadosRes] = await Promise.all([
    supabase.from('gastos_fixos').select('*').order('nome'),
    supabase.from('gastos_fixos_lancados').select('*').eq('competencia', competencia),
  ])

  if (fixosRes.error) throw new Error(fixosRes.error.message)
  if (lancadosRes.error) throw new Error(lancadosRes.error.message)

  const fixos = fixosRes.data.map(paraGastoFixo)
  const lancados: GastoFixoLancado[] = lancadosRes.data.map((l) => ({
    gastoFixoId: l.gasto_fixo_id,
    competencia: l.competencia,
    lancamentoId: l.lancamento_id,
  }))

  return gastosPendentes(fixos, lancados, competencia)
}

export async function GET() {
  const competencia = competenciaAtual()
  try {
    return NextResponse.json({ competencia, pendentes: await carregarPendentes(competencia) })
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 })
  }
}

type ItemConfirmado = {
  gastoFixoId: string
  valorCentavos: number
  data: string
}

export async function POST(request: Request) {
  let itens: ItemConfirmado[] | undefined
  try {
    itens = ((await request.json()) as { itens?: ItemConfirmado[] }).itens
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  if (!Array.isArray(itens) || itens.length === 0) {
    return NextResponse.json({ erro: 'Nada para lançar.' }, { status: 400 })
  }

  const supabase = clienteServidor()
  const competencia = competenciaAtual()
  const falhas: string[] = []

  for (const item of itens) {
    if (!Number.isInteger(item.valorCentavos) || item.valorCentavos <= 0) {
      falhas.push(`Valor inválido em ${item.gastoFixoId}.`)
      continue
    }
    if (competenciaDe(item.data) !== competencia) {
      falhas.push('A data precisa estar dentro do mês corrente.')
      continue
    }

    const { data: fixo } = await supabase
      .from('gastos_fixos')
      .select('nome, categoria_id, pago_por')
      .eq('id', item.gastoFixoId)
      .single()

    if (!fixo) {
      falhas.push(`Gasto fixo ${item.gastoFixoId} não encontrado.`)
      continue
    }

    const { data: lancamento, error: erroLancamento } = await supabase
      .from('lancamentos')
      .insert({
        tipo: 'saida',
        data: item.data,
        valor_centavos: item.valorCentavos,
        descricao: fixo.nome,
        categoria_id: fixo.categoria_id,
        // Herda de quem costuma pagar: o condomínio sai do bolso do sócio
        // todo mês, e marcar isso a cada lançamento seria esquecível.
        pago_por: fixo.pago_por === 'socio' ? 'socio' : 'voce',
      })
      .select('id')
      .single()

    if (erroLancamento || !lancamento) {
      falhas.push(`Não foi possível lançar ${fixo.nome}.`)
      continue
    }

    const { error: erroControle } = await supabase.from('gastos_fixos_lancados').insert({
      gasto_fixo_id: item.gastoFixoId,
      competencia,
      lancamento_id: lancamento.id,
    })

    if (erroControle) {
      // A chave única barrou: outro dispositivo já lançou este gasto neste mês.
      // Desfaz o lançamento para não deixar despesa duplicada e sem controle.
      await supabase.from('lancamentos').delete().eq('id', lancamento.id)
      falhas.push(`${fixo.nome} já havia sido lançado neste mês.`)
    }
  }

  return NextResponse.json({
    ok: falhas.length === 0,
    falhas,
    pendentes: await carregarPendentes(competencia),
  })
}
