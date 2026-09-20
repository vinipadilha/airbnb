'use client'

import { deslocarCompetencia, rotuloCompetencia } from '@/lib/competencia'

type Props = {
  competencia: string
  /** Mês pedido ainda sem dados: o conteúdo abaixo é do mês anterior. */
  carregando?: boolean
  onMudar: (competencia: string, direcao: 1 | -1) => void
}

export function SeletorMes({ competencia, carregando, onMudar }: Props) {
  return (
    <div className="flex items-center justify-between">
      <button
        onClick={() => onMudar(deslocarCompetencia(competencia, -1), -1)}
        aria-label="Mês anterior"
        className="rounded-full px-3 py-2 text-slate-400 transition-colors hover:text-slate-900"
      >
        ‹
      </button>
      <span className="flex items-center gap-2">
        <span className="text-sm font-medium capitalize">
          {rotuloCompetencia(competencia)}
        </span>
        {/* Só aparece quando o mês pedido ainda não chegou. Sem isso, a tela
            fica parada sem explicar por quê. */}
        {carregando && (
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" />
        )}
      </span>
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
