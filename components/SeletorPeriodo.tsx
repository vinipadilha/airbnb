'use client'

import { useState } from 'react'
import { noitesEntre, somarDias } from '@/lib/calendario'
import { competenciaDe, hojeEmSaoPaulo } from '@/lib/competencia'
import { GradeMes } from './GradeMes'

type Props = {
  /** YYYY-MM-DD */
  inicio: string
  /** YYYY-MM-DD, sempre depois do início. */
  fim: string
  onChange: (inicio: string, fim: string) => void
}

export function SeletorPeriodo({ inicio, fim, onChange }: Props) {
  /** Depois do primeiro toque, o próximo fecha o período. */
  const [escolhendoFim, setEscolhendoFim] = useState(false)

  const hoje = hojeEmSaoPaulo()
  const noites = noitesEntre(inicio, fim)

  function tocar(data: string) {
    if (!escolhendoFim) {
      // Primeiro toque: marca o check-in e propõe uma noite, para o período
      // nunca ficar inválido enquanto o usuário decide o check-out.
      onChange(data, somarDias(data, 1))
      setEscolhendoFim(true)
      return
    }

    if (data <= inicio) {
      // Tocou antes do check-in: recomeça a partir daí, em vez de recusar.
      onChange(data, somarDias(data, 1))
      return
    }

    onChange(inicio, data)
    setEscolhendoFim(false)
  }

  function classeDoDia(data: string): string {
    const ponta = data === inicio || data === fim
    // O dia do check-out não é noite dormida, mas precisa aparecer marcado:
    // é ele que se toca para fechar o período.
    const dentro = data > inicio && data < fim

    if (ponta) {
      const cantos = data === inicio ? 'rounded-l-lg' : 'rounded-r-lg'
      return `${cantos} bg-slate-900 font-medium text-white`
    }
    if (dentro) return 'bg-slate-900/15 text-slate-700'
    if (data === hoje) {
      return 'rounded-lg text-slate-500 ring-1 ring-inset ring-amber-400 hover:bg-slate-200'
    }
    return 'rounded-lg text-slate-500 hover:bg-slate-200'
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-slate-100 p-3">
      <GradeMes
        competenciaInicial={competenciaDe(inicio)}
        classeDoDia={classeDoDia}
        onTocarDia={tocar}
      />

      <div className="flex items-baseline justify-between px-1">
        <span className="text-[11px] text-slate-500">
          {escolhendoFim ? 'Agora toque no check-out' : 'Toque para mudar o período'}
        </span>
        <span className="text-[11px] tabular-nums text-slate-500">
          {noites} {noites === 1 ? 'noite' : 'noites'}
        </span>
      </div>
    </div>
  )
}
