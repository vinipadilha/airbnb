import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { COOKIE_SESSAO, verificarToken } from '@/lib/sessao'

export async function middleware(request: NextRequest) {
  const segredo = process.env.APP_SESSION_SECRET
  if (!segredo) {
    return new NextResponse('Servidor mal configurado.', { status: 500 })
  }

  const token = request.cookies.get(COOKIE_SESSAO)?.value
  if (token && (await verificarToken(token, segredo))) {
    return NextResponse.next()
  }

  // Chamada de API recebe 401, não redirect. Um redirect seria seguido pelo
  // fetch, que receberia o HTML da tela de login com status 200 — e o
  // dashboard mostraria "não foi possível carregar" em vez de mandar o usuário
  // para o login.
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ erro: 'Sessão expirada.' }, { status: 401 })
  }

  return NextResponse.redirect(new URL('/entrar', request.url))
}

// Protege tudo, menos a própria tela de entrada, o endpoint que valida o PIN,
// os arquivos estáticos e os ícones.
export const config = {
  matcher: [
    '/((?!entrar|api/sessao|_next/static|_next/image|_next/webpack-hmr|favicon.ico|manifest.json|icon|apple-icon).*)',
  ],
}
