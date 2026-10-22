import { NextResponse } from 'next/server'
import { carregarConfiguracoes } from '@/lib/configuracoes'
import { ehTema } from '@/lib/tema'
import { clienteServidor } from '@/lib/supabase'

export async function GET() {
  return NextResponse.json(await carregarConfiguracoes())
}

export async function PATCH(request: Request) {
  let corpo: Record<string, unknown>
  try {
    corpo = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  const mudancas: Record<string, unknown> = {}

  if (corpo.percentualGestao !== undefined) {
    const p = corpo.percentualGestao
    if (!Number.isInteger(p) || (p as number) < 0 || (p as number) > 100) {
      return NextResponse.json(
        { erro: 'O percentual precisa ser um número inteiro entre 0 e 100.' },
        { status: 400 },
      )
    }
    mudancas.percentual_gestao = p
  }

  if (corpo.nomeSocio !== undefined) {
    if (typeof corpo.nomeSocio !== 'string' || corpo.nomeSocio.trim() === '') {
      return NextResponse.json({ erro: 'Informe o nome do sócio.' }, { status: 400 })
    }
    mudancas.nome_socio = corpo.nomeSocio.trim()
  }

  // Nulo desliga o teto e volta à divisão só por porcentagem.
  if (corpo.limiteSocioCentavos !== undefined) {
    const l = corpo.limiteSocioCentavos
    if (l !== null && (!Number.isInteger(l) || (l as number) <= 0)) {
      return NextResponse.json(
        { erro: 'O teto precisa ser um valor maior que zero.' },
        { status: 400 },
      )
    }
    mudancas.limite_socio_centavos = l
  }

  if (corpo.tema !== undefined) {
    if (!ehTema(corpo.tema)) {
      return NextResponse.json({ erro: 'Tema inválido.' }, { status: 400 })
    }
    mudancas.tema = corpo.tema
  }

  if (Object.keys(mudancas).length === 0) {
    return NextResponse.json({ erro: 'Nada para alterar.' }, { status: 400 })
  }

  const { error } = await clienteServidor()
    .from('configuracoes')
    .update(mudancas)
    .eq('id', 1)

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json(await carregarConfiguracoes())
}
