'use client'

import { hojeEmSaoPaulo, competenciaDe } from '@/lib/competencia'
import { GradeMes } from './GradeMes'

type Props = {
  /** YYYY-MM-DD */
  valor: string
  onChange: (data: string) => void
}

export function SeletorData({ valor, onChange }: Props) {
  const hoje = hojeEmSaoPaulo()

  function classeDoDia(data: string): string {
    if (data === valor) return 'rounded-lg bg-slate-900 font-medium text-white'
    if (data === hoje) {
      return 'rounded-lg text-slate-500 ring-1 ring-inset ring-amber-400 hover:bg-slate-200'
    }
    return 'rounded-lg text-slate-500 hover:bg-slate-200'
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-slate-100 p-3">
      <GradeMes
        competenciaInicial={competenciaDe(valor)}
        classeDoDia={classeDoDia}
        onTocarDia={onChange}
      />
    </div>
  )
}
