'use client'

import { formatCentavos } from '@/lib/dinheiro'
import type { Rateio } from '@/lib/rateio'
import { ValorAnimado } from './ValorAnimado'

type Props = {
  rateio: Rateio
  percentualSeu: number
}

export function CardRateio({ rateio, percentualSeu }: Props) {
  const { liquidoCentavos, suaParteCentavos, parteDoSocioCentavos } = rateio
  const { repassadoCentavos, aRepassarCentavos } = rateio

  if (liquidoCentavos === 0 && repassadoCentavos === 0) return null

  // Proporção da barra. Num mês no prejuízo não há o que dividir visualmente.
  const fatiaSua = liquidoCentavos > 0 ? (suaParteCentavos / liquidoCentavos) * 100 : 0

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-slate-500">Divisão do resultado</span>
        <span className="text-xs text-slate-400">
          líquido {formatCentavos(liquidoCentavos)}
        </span>
      </div>

      {liquidoCentavos > 0 && (
        <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="bg-slate-900" style={{ width: `${fatiaSua}%` }} />
          <div className="flex-1 bg-slate-300" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="h-2 w-2 rounded-full bg-slate-900" />
            Sua parte ({percentualSeu}%)
          </span>
          <ValorAnimado centavos={suaParteCentavos} className="text-lg" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            Seu pai ({100 - percentualSeu}%)
          </span>
          <ValorAnimado centavos={parteDoSocioCentavos} className="text-lg" />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-4">
        <span className="flex flex-col">
          <span className="text-xs text-slate-500">
            {aRepassarCentavos > 0
              ? 'Falta repassar'
              : aRepassarCentavos < 0
                ? 'Você adiantou'
                : 'Tudo repassado'}
          </span>
          <span className="text-[11px] text-slate-400">
            já enviou {formatCentavos(repassadoCentavos)}
          </span>
        </span>
        <span
          className={`text-xl tabular-nums ${
            aRepassarCentavos > 0
              ? 'text-amber-600'
              : aRepassarCentavos < 0
                ? 'text-sky-600'
                : 'text-emerald-600'
          }`}
        >
          {formatCentavos(Math.abs(aRepassarCentavos))}
        </span>
      </div>
    </div>
  )
}
