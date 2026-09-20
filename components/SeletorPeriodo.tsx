'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { diasDoMes, noitesEntre, somarDias } from '@/lib/calendario'
import {
  competenciaDe,
  deslocarCompetencia,
  hojeEmSaoPaulo,
  rotuloCompetencia,
} from '@/lib/competencia'

const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

type Props = {
  /** YYYY-MM-DD */
  inicio: string
  /** YYYY-MM-DD, sempre depois do início. */
  fim: string
  onChange: (inicio: string, fim: string) => void
}

export function SeletorPeriodo({ inicio, fim, onChange }: Props) {
  const [competencia, setCompetencia] = useState(competenciaDe(inicio))
  const [direcao, setDirecao] = useState<1 | -1>(1)
  /** Depois do primeiro toque, o próximo fecha o período. */
  const [escolhendoFim, setEscolhendoFim] = useState(false)
  const reduzirMovimento = useReducedMotion()

  const hoje = hojeEmSaoPaulo()
  const dias = diasDoMes([], competencia)
  const vazias = dias.length > 0 ? dias[0].diaDaSemana : 0
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

  function mudarMes(delta: 1 | -1) {
    setDirecao(delta)
    setCompetencia(deslocarCompetencia(competencia, delta))
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-slate-100 p-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => mudarMes(-1)}
          aria-label="Mês anterior"
          className="rounded-full px-3 py-1 text-slate-400 transition-colors hover:text-slate-900"
        >
          ‹
        </button>
        <span className="text-xs font-medium capitalize">
          {rotuloCompetencia(competencia)}
        </span>
        <button
          type="button"
          onClick={() => mudarMes(1)}
          aria-label="Próximo mês"
          className="rounded-full px-3 py-1 text-slate-400 transition-colors hover:text-slate-900"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px">
        {SEMANA.map((letra, i) => (
          <span key={i} className="pb-1 text-center text-[10px] text-slate-400">
            {letra}
          </span>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={competencia}
          initial={reduzirMovimento ? false : { opacity: 0, x: direcao * 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direcao * -16 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="grid grid-cols-7 gap-px"
        >
          {Array.from({ length: vazias }, (_, i) => (
            <span key={`vazia-${i}`} />
          ))}

          {dias.map((d) => {
            const ehInicio = d.data === inicio
            const ehFim = d.data === fim
            // O dia do check-out não é noite dormida, mas precisa aparecer
            // marcado: é ele que o usuário toca para fechar o período.
            const dentro = d.data > inicio && d.data < fim

            return (
              <button
                type="button"
                key={d.data}
                onClick={() => tocar(d.data)}
                className={[
                  'flex aspect-square items-center justify-center text-xs tabular-nums transition-colors',
                  ehInicio || ehFim
                    ? 'bg-slate-900 font-medium text-white'
                    : dentro
                      ? 'bg-slate-900/15 text-slate-700'
                      : 'text-slate-500 hover:bg-slate-200',
                  ehInicio ? 'rounded-l-lg' : '',
                  ehFim ? 'rounded-r-lg' : '',
                  !ehInicio && !ehFim && !dentro ? 'rounded-lg' : '',
                  d.data === hoje && !ehInicio && !ehFim
                    ? 'ring-1 ring-inset ring-amber-400'
                    : '',
                ].join(' ')}
              >
                {d.dia}
              </button>
            )
          })}
        </motion.div>
      </AnimatePresence>

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
