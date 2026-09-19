'use client'

import { deslocarCompetencia, rotuloCompetencia } from '@/lib/competencia'

type Props = {
  competencia: string
  onMudar: (competencia: string, direcao: 1 | -1) => void
}

export function SeletorMes({ competencia, onMudar }: Props) {
  return (
    <div className="flex items-center justify-between">
      <button
        onClick={() => onMudar(deslocarCompetencia(competencia, -1), -1)}
        aria-label="Mês anterior"
        className="rounded-full px-3 py-2 text-slate-400 transition-colors hover:text-slate-900"
      >
        ‹
      </button>
      <span className="text-sm font-medium capitalize">{rotuloCompetencia(competencia)}</span>
      <button
        onClick={() => onMudar(deslocarCompetencia(competencia, 1), 1)}
        aria-label="Próximo mês"
        className="rounded-full px-3 py-2 text-slate-400 transition-colors hover:text-slate-900"
      >
        ›
      </button>
    </div>
  )
}
