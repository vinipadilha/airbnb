import { NextResponse } from 'next/server'
import { bloqueado, ipDoPedido, registrarFalha } from '@/lib/limite-tentativas'
import { COOKIE_SESSAO, DURACAO_SESSAO_MS, assinarToken, comparaSegura } from '@/lib/sessao'

export async function POST(request: Request) {
  const pinEsperado = process.env.APP_PIN
  const segredo = process.env.APP_SESSION_SECRET
  if (!pinEsperado || !segredo) {
    return NextResponse.json({ erro: 'Servidor mal configurado.' }, { status: 500 })
  }

  const ip = ipDoPedido(request)

  if (await bloqueado(ip)) {
    return NextResponse.json(
      { erro: 'Muitas tentativas. Tente de novo em 15 minutos.' },
      { status: 429 },
    )
  }

  let pin: unknown
  try {
    pin = ((await request.json()) as { pin?: unknown }).pin
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  if (typeof pin !== 'string' || !comparaSegura(pin, pinEsperado)) {
    await registrarFalha(ip)
    // Mensagem genérica: não revela se o PIN existe, tem outro tamanho, etc.
    return NextResponse.json({ erro: 'PIN incorreto.' }, { status: 401 })
  }

  const expiraEm = Date.now() + DURACAO_SESSAO_MS
  const resposta = NextResponse.json({ ok: true })
  resposta.cookies.set(COOKIE_SESSAO, await assinarToken(expiraEm, segredo), {
    httpOnly: true,
    // Em produção sempre secure. Em dev fica false porque o localhost do
    // Step 3 da Task 13 é http, e um cookie secure simplesmente não seria
    // gravado ali — você não conseguiria testar a tranca.
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(DURACAO_SESSAO_MS / 1000),
  })
  return resposta
}
