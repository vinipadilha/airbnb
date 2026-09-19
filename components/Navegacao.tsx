'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITENS = [
  { href: '/', rotulo: 'Resumo' },
  { href: '/fixos', rotulo: 'Fixos' },
  { href: '/ajustes', rotulo: 'Ajustes' },
]

export function Navegacao() {
  const atual = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center border-t border-slate-200 bg-white/90 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:backdrop-blur-none">
      <div className="flex w-full max-w-md justify-around p-2 sm:justify-start sm:gap-2 sm:p-0">
        {ITENS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-xl px-4 py-2 text-sm transition-colors ${
              atual === item.href ? 'bg-slate-900 text-white' : 'text-slate-500'
            }`}
          >
            {item.rotulo}
          </Link>
        ))}
      </div>
    </nav>
  )
}
