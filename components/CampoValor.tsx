'use client'

import { useState } from 'react'
import { formatCentavos, parseValorBRL } from '@/lib/dinheiro'

type Props = {
  valorCentavos: number | null
  onChange: (centavos: number | null) => void
  autoFocus?: boolean
}

export function CampoValor({ valorCentavos, onChange, autoFocus }: Props) {
  const [texto, setTexto] = useState(
    valorCentavos === null ? '' : formatCentavos(valorCentavos).replace('R$', '').trim(),
  )

  function digitou(bruto: string) {
    setTexto(bruto)
    onChange(parseValorBRL(bruto))
  }

  const invalido = texto.trim() !== '' && parseValorBRL(texto) === null

  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-slate-500">Valor</span>
      <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3">
        <span className="text-slate-400">R$</span>
        <input
          autoFocus={autoFocus}
          inputMode="decimal"
          value={texto}
          onChange={(e) => digitou(e.target.value)}
          placeholder="0,00"
          className="w-full bg-transparent text-right text-xl tabular-nums outline-none"
        />
      </div>
      {invalido && <span className="text-xs text-red-600">Valor inválido.</span>}
    </label>
  )
}
