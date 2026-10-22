'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTema } from './ProvedorTema'

const ITENS = [
  { href: '/', rotulo: 'Resumo' },
  { href: '/calendario', rotulo: 'Agenda' },
  { href: '/analise', rotulo: 'Análise' },
  { href: '/fixos', rotulo: 'Fixos' },
  { href: '/ajustes', rotulo: 'Ajustes' },
]

function Sol() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

function Lua() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
    </svg>
  )
}

export function Navegacao() {
  const atual = usePathname()
  const { escuro, mudarTema } = useTema()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center border-t border-slate-200 bg-white/90 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:backdrop-blur-none">
      <div className="flex w-full max-w-md items-center justify-around gap-0.5 p-2 sm:max-w-none sm:justify-start sm:gap-2 sm:p-0">
        {ITENS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-xl px-2 py-2 text-xs transition-colors sm:px-4 sm:text-sm ${
              atual === item.href
                ? 'bg-marca/15 font-medium text-marca'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {item.rotulo}
          </Link>
        ))}

        {/* Alterna claro/escuro na hora. A escolha de três vias, com "seguir
            o sistema", fica em Ajustes; aqui é o atalho de um toque. */}
        <button
          onClick={() => mudarTema(escuro ? 'claro' : 'escuro')}
          aria-label={escuro ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
          title={escuro ? 'Modo claro' : 'Modo escuro'}
          className="rounded-xl p-2 text-slate-500 transition-colors hover:text-slate-900 sm:ml-auto"
        >
          {escuro ? <Sol /> : <Lua />}
        </button>
      </div>
    </nav>
  )
}
