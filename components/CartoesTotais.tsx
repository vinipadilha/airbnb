'use client'

import { formatCentavos } from '@/lib/dinheiro'
import type { TotaisMes } from '@/lib/totais'
import { ValorAnimado } from './ValorAnimado'

type Props = {
  totais: TotaisMes
  saldoTotalCentavos: number
  /* Diária média — desligada junto com o calendário em 2026-09-20.
     Para religar, volte este campo e passe dados.diariaMediaCentavos
     em app/page.tsx; o cálculo continua vivo em lib/calendario.ts.
  diariaMediaCentavos: number
  */
}

export function CartoesTotais({ totais, saldoTotalCentavos }: Props) {
  // Margem só aparece quando houve entrada E saída no mês: dividir por zero
  // daria NaN, e um mês sem gasto nenhum exibiria "margem 100%", que não
  // informa nada além de que ainda não se lançou despesa.
  const margem =
    totais.entradas > 0 && totais.saidas > 0
      ? Math.round((totais.saldo / totais.entradas) * 100)
      : null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 rounded-2xl bg-white p-5 shadow-sm">
        <span className="text-xs text-slate-500">Saldo do mês</span>
        <ValorAnimado
          centavos={totais.saldo}
          className={`text-3xl font-medium ${totais.saldo < 0 ? 'text-red-600' : 'text-slate-900'}`}
        />
        <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
          {/* Só faz sentido mostrar o estimado quando ele difere do real —
              sem reserva programada os dois são o mesmo número. */}
          {totais.entradasProgramadas > 0 && (
            <span className="text-slate-500">
              estimado {formatCentavos(totais.saldoEstimado)}
            </span>
          )}
          {margem !== null && <span>margem {margem}%</span>}
          <span>acumulado {formatCentavos(saldoTotalCentavos)}</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1 rounded-2xl bg-white p-5 shadow-sm">
          <span className="text-xs text-slate-500">Entradas</span>
          <ValorAnimado centavos={totais.entradas} className="text-lg text-emerald-600" />
          {totais.entradasProgramadas > 0 && (
            <span className="flex flex-col text-[11px] tabular-nums text-slate-400">
              <span>programado {formatCentavos(totais.entradasProgramadas)}</span>
              <span className="text-slate-500">
                estimado {formatCentavos(totais.entradasEstimadas)}
              </span>
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1 rounded-2xl bg-white p-5 shadow-sm">
          <span className="text-xs text-slate-500">Saídas</span>
          <ValorAnimado centavos={totais.saidas} className="text-lg text-red-600" />
        </div>
      </div>

      {/* Diária média — ver comentário no tipo Props.
      <div className="flex flex-col gap-1 rounded-2xl bg-white p-5 shadow-sm">
        <span className="text-xs text-slate-500">Diária média</span>
        <ValorAnimado centavos={diariaMediaCentavos} className="text-lg text-slate-700" />
      </div>
      */}
    </div>
  )
}
