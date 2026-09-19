import { NextResponse } from 'next/server'
import { clienteServidor } from '@/lib/supabase'

/**
 * Todas as entradas já gravadas, com o mínimo que a detecção de duplicados
 * precisa. Não dá para usar /api/mes aqui: ele devolve só o mês corrente, e o
 * histórico a importar é de 2025 — a comparação nunca encontraria nada.
 */
export async function GET() {
  const { data, error } = await clienteServidor()
    .from('lancamentos')
    .select('data, valor_centavos')
    .eq('tipo', 'entrada')

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  return NextResponse.json(
    data.map((l) => ({
      tipo: 'entrada' as const,
      data: l.data as string,
      valorCentavos: l.valor_centavos as number,
    })),
  )
}
