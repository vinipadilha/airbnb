'use client'

import type { Tema } from '@/lib/tema'
import { useTema } from './ProvedorTema'

const OPCOES: { valor: Tema; rotulo: string }[] = [
  { valor: 'claro', rotulo: 'Claro' },
  { valor: 'escuro', rotulo: 'Escuro' },
  { valor: 'sistema', rotulo: 'Sistema' },
]

export function CardTema() {
  const { tema, mudarTema } = useTema()

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm">
      <span className="text-xs text-slate-500">Aparência</span>

      <div className="flex gap-2 rounded-xl bg-slate-100 p-1">
        {OPCOES.map((op) => (
          <button
            key={op.valor}
            onClick={() => mudarTema(op.valor)}
            className={`flex-1 rounded-lg py-2 text-sm transition-colors ${
              tema === op.valor ? 'bg-white shadow-sm' : 'text-slate-500'
            }`}
          >
            {op.rotulo}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-400">
        {tema === 'sistema'
          ? 'Acompanha o aparelho: escurece quando ele escurecer.'
          : 'Fica salvo e vale para todos os seus aparelhos.'}
      </p>
    </div>
  )
}
