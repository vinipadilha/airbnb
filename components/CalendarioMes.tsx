'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { DiaDoMes, Ocupacao } from '@/lib/calendario'
import { hojeEmSaoPaulo } from '@/lib/competencia'

const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

type Props = {
  dias: DiaDoMes[]
  ocupacao: Ocupacao
}

export function CalendarioMes({ dias, ocupacao }: Props) {
  const reduzirMovimento = useReducedMotion()
  const hoje = hojeEmSaoPaulo()

  // Células vazias antes do dia 1, para o mês começar no dia da semana certo.
  const vazias = dias.length > 0 ? dias[0].diaDaSemana : 0

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-slate-500">Ocupação</span>
        <span className="text-xs text-slate-400">
          {ocupacao.noitesOcupadas} de {ocupacao.diasNoMes} noites
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-3xl font-medium tabular-nums">{ocupacao.percentual}%</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
          <motion.div
            className="h-full rounded-full bg-slate-900"
            initial={reduzirMovimento ? false : { scaleX: 0 }}
            animate={{ scaleX: ocupacao.percentual / 100 }}
            style={{ transformOrigin: 'left' }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {SEMANA.map((letra, i) => (
          <span key={i} className="pb-1 text-center text-[10px] text-slate-300">
            {letra}
          </span>
        ))}

        {Array.from({ length: vazias }, (_, i) => (
          <span key={`vazia-${i}`} />
        ))}

        {dias.map((d, i) => {
          // As pontas ficam arredondadas só do lado de fora da estadia, para as
          // noites do meio formarem uma faixa contínua.
          const inicioDeFaixa = d.ocupado && (d.checkIn || d.diaDaSemana === 0 || i === 0)
          const fimDeFaixa =
            d.ocupado &&
            (d.diaDaSemana === 6 || i === dias.length - 1 || !dias[i + 1]?.ocupado)

          return (
            <motion.div
              key={d.data}
              initial={reduzirMovimento ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.18, delay: Math.min(i * 0.008, 0.25) }}
              title={d.reserva ?? undefined}
              className={[
                'flex aspect-square items-center justify-center text-xs tabular-nums transition-colors',
                d.ocupado ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400',
                inicioDeFaixa ? 'rounded-l-lg' : '',
                fimDeFaixa ? 'rounded-r-lg' : '',
                !d.ocupado ? 'rounded-lg' : '',
                d.data === hoje ? 'ring-2 ring-inset ring-amber-400' : '',
              ].join(' ')}
            >
              {d.dia}
            </motion.div>
          )
        })}
      </div>

      <div className="flex items-center gap-4 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-slate-900" /> reservado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-slate-100" /> livre
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm ring-2 ring-inset ring-amber-400" /> hoje
        </span>
      </div>
    </div>
  )
}
