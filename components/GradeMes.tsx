'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { diasDoMes } from '@/lib/calendario'
import { deslocarCompetencia, rotuloCompetencia } from '@/lib/competencia'

const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

type Props = {
  /** Mês exibido ao abrir. */
  competenciaInicial: string
  /** Classes da célula de cada dia, decididas por quem usa a grade. */
  classeDoDia: (data: string) => string
  onTocarDia: (data: string) => void
}

/**
 * Grade de um mês, navegável. Só desenha e avisa qual dia foi tocado — quem
 * usa decide o que cada dia significa. Existe para o seletor de período e o de
 * data única não virarem dois calendários que divergem com o tempo.
 */
export function GradeMes({ competenciaInicial, classeDoDia, onTocarDia }: Props) {
  const [competencia, setCompetencia] = useState(competenciaInicial)
  const [direcao, setDirecao] = useState<1 | -1>(1)
  const reduzirMovimento = useReducedMotion()

  const dias = diasDoMes([], competencia)
  const vazias = dias.length > 0 ? dias[0].diaDaSemana : 0

  function mudarMes(delta: 1 | -1) {
    setDirecao(delta)
    setCompetencia(deslocarCompetencia(competencia, delta))
  }

  return (
    <>
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

          {dias.map((d) => (
            <button
              type="button"
              key={d.data}
              onClick={() => onTocarDia(d.data)}
              className={`flex aspect-square items-center justify-center text-xs tabular-nums transition-colors ${classeDoDia(d.data)}`}
            >
              {d.dia}
            </button>
          ))}
        </motion.div>
      </AnimatePresence>
    </>
  )
}
