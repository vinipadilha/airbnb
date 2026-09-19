import { NextResponse } from 'next/server'
import { clienteServidor } from '@/lib/supabase'

type LinhaParaGravar = {
  data: string
  valorCentavos: number
  descricao: string
  noites: number | null
  hospedes: number | null
}

export async function POST(request: Request) {
  const { linhas } = (await request.json()) as { linhas?: LinhaParaGravar[] }

  if (!Array.isArray(linhas) || linhas.length === 0) {
    return NextResponse.json({ erro: 'Nada para importar.' }, { status: 400 })
  }

  const positivoOuNulo = (v: number | null) => v === null || (Number.isInteger(v) && v > 0)

  const invalida = linhas.find(
    (l) =>
      !/^\d{4}-\d{2}-\d{2}$/.test(l.data) ||
      !Number.isInteger(l.valorCentavos) ||
      l.valorCentavos <= 0 ||
      !positivoOuNulo(l.noites) ||
      !positivoOuNulo(l.hospedes),
  )
  if (invalida) {
    return NextResponse.json(
      { erro: 'O arquivo contém linha inválida. Revise o preview.' },
      { status: 400 },
    )
  }

  // Spec §7: import é só de entradas, todas com origem Airbnb.
  const { data, error } = await clienteServidor()
    .from('lancamentos')
    .insert(
      linhas.map((l) => ({
        tipo: 'entrada',
        data: l.data,
        valor_centavos: l.valorCentavos,
        descricao: l.descricao,
        origem: 'Airbnb',
        noites: l.noites,
        hospedes: l.hospedes,
      })),
    )
    .select()

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  return NextResponse.json({ importadas: data.length })
}
