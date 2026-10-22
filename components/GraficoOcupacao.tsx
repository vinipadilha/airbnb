'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { OcupacaoDoAno } from '@/lib/analise'

type Props = {
  meses: OcupacaoDoAno[]
  selecionado: string
  onSelecionar: (competencia: string) => void
}

/**
 * Ocupação mês a mês, sempre na escala de 0 a 100%. Escala fixa de propósito:
 * ajustar o eixo ao maior mês faria 60% parecer cheio num ano fraco.
 */
export function GraficoOcupacao({ meses, selecionado, onSelecionar }: Props) {
  const reduzirMovimento = useReducedMotion()
  const comDados = meses.filter((m) => m.noitesOcupadas > 0)
  const media =
    comDados.length === 0
      ? 0
      : Math.round(comDados.reduce((t, m) => t + m.percentual, 0) / comDados.length)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold">Ocupação por mês</span>
        {comDados.length > 0 && (
          <span className="text-xs text-slate-400">
            média <span className="font-medium text-slate-700 tabular-nums">{media}%</span> nos
            meses com reserva
          </span>
        )}
      </div>

      <div className="flex h-32 items-end gap-1.5">
        {meses.map((m) => {
          const ativo = m.competencia === selecionado
          return (
            <button
              key={m.competencia}
              onClick={() => onSelecionar(m.competencia)}
              title={`${m.rotulo}: ${m.percentual}% (${m.noitesOcupadas} de ${m.diasNoMes} noites)`}
              className="group relative flex h-full flex-1 flex-col justify-end"
            >
              {/* Trilho de fundo: mostra quanto do mês ficou vazio. */}
              <div className="absolute inset-0 rounded-lg bg-slate-100" />
              <motion.div
                initial={reduzirMovimento ? false : { height: 0 }}
                animate={{ height: `${m.percentual}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className={`relative w-full rounded-lg transition-opacity ${
                  ativo ? 'bg-marca-gradiente opacity-100' : 'bg-marca opacity-50 group-hover:opacity-80'
                }`}
              />
              {m.percentual > 0 && (
                <span
                  className={`absolute inset-x-0 bottom-1 text-center text-[9px] font-medium tabular-nums ${
                    m.percentual >= 18 ? 'text-branco' : 'text-slate-500'
                  }`}
                  // Abaixo de ~18% a barra é curta demais para conter o número;
                  // ele sobe para cima dela, sobre o trilho.
                  style={m.percentual < 18 ? { bottom: `calc(${m.percentual}% + 4px)` } : undefined}
                >
                  {m.percentual}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex gap-1.5">
        {meses.map((m) => (
          <span
            key={m.competencia}
            className={`flex-1 text-center text-[10px] ${
              m.competencia === selecionado ? 'font-medium text-marca' : 'text-slate-400'
            }`}
          >
            {m.rotulo}
          </span>
        ))}
      </div>
    </div>
  )
}
