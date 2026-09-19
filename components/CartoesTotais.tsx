'use client'

import type { TotaisMes } from '@/lib/totais'
import { ValorAnimado } from './ValorAnimado'

type Props = {
  totais: TotaisMes
  saldoTotalCentavos: number
}

export function CartoesTotais({ totais, saldoTotalCentavos }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1 rounded-2xl bg-white p-5 shadow-sm">
          <span className="text-xs text-slate-500">Entradas</span>
          <ValorAnimado centavos={totais.entradas} className="text-lg text-emerald-600" />
        </div>
        <div className="flex flex-col gap-1 rounded-2xl bg-white p-5 shadow-sm">
          <span className="text-xs text-slate-500">Saídas</span>
          <ValorAnimado centavos={totais.saidas} className="text-lg text-red-600" />
        </div>
      </div>

      <div className="flex flex-col gap-1 rounded-2xl bg-white p-5 shadow-sm">
        <span className="text-xs text-slate-500">Saldo do mês</span>
        <ValorAnimado
          centavos={totais.saldo}
          className={`text-3xl font-medium ${totais.saldo < 0 ? 'text-red-600' : 'text-slate-900'}`}
        />
        <span className="mt-2 text-xs text-slate-400">
          Saldo total: <ValorAnimado centavos={saldoTotalCentavos} />
        </span>
      </div>
    </div>
  )
}
