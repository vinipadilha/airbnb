'use client'

import { formatCentavos } from '@/lib/dinheiro'
import type { TotaisMes } from '@/lib/totais'
import { ValorAnimado } from './ValorAnimado'

type Props = {
  totais: TotaisMes
  saldoTotalCentavos: number
  diariaMediaCentavos: number
}

export function CartoesTotais({ totais, saldoTotalCentavos, diariaMediaCentavos }: Props) {
  // Margem só faz sentido quando houve faturamento; dividir por zero daria NaN
  // na tela.
  const margem =
    totais.entradas > 0 ? Math.round((totais.saldo / totais.entradas) * 100) : null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 rounded-2xl bg-white p-5 shadow-sm">
        <span className="text-xs text-slate-500">Lucro do mês</span>
        <ValorAnimado
          centavos={totais.saldo}
          className={`text-3xl font-medium ${totais.saldo < 0 ? 'text-red-600' : 'text-slate-900'}`}
        />
        <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
          {margem !== null && <span>margem {margem}%</span>}
          <span>acumulado {formatCentavos(saldoTotalCentavos)}</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1 rounded-2xl bg-white p-5 shadow-sm">
          <span className="text-xs text-slate-500">Faturamento</span>
          <ValorAnimado centavos={totais.entradas} className="text-lg text-emerald-600" />
        </div>
        <div className="flex flex-col gap-1 rounded-2xl bg-white p-5 shadow-sm">
          <span className="text-xs text-slate-500">Gastos</span>
          <ValorAnimado centavos={totais.saidas} className="text-lg text-red-600" />
        </div>
        <div className="col-span-2 flex flex-col gap-1 rounded-2xl bg-white p-5 shadow-sm sm:col-span-1">
          <span className="text-xs text-slate-500">Diária média</span>
          <ValorAnimado centavos={diariaMediaCentavos} className="text-lg text-slate-700" />
        </div>
      </div>
    </div>
  )
}
