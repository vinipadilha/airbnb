'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import type { MesDoAno } from '@/lib/analise'
import { rotuloCompetencia } from '@/lib/competencia'
import { formatCentavos } from '@/lib/dinheiro'

type Props = {
  meses: MesDoAno[]
  selecionado: string
  onSelecionar: (competencia: string) => void
}

/** Escala do eixo: arredonda para cima até um número redondo. */
function tetoDoEixo(maximo: number): number {
  if (maximo === 0) return 100000
  const magnitude = 10 ** Math.floor(Math.log10(maximo))
  return Math.ceil(maximo / magnitude) * magnitude
}

function rotuloEixo(centavos: number): string {
  const reais = centavos / 100
  if (reais >= 1000) return `R$ ${(reais / 1000).toLocaleString('pt-BR')} mil`
  return `R$ ${reais.toLocaleString('pt-BR')}`
}

export function GraficoAno({ meses, selecionado, onSelecionar }: Props) {
  const reduzirMovimento = useReducedMotion()
  const [sobre, setSobre] = useState<number | null>(null)

  const maximo = Math.max(...meses.map((m) => m.totalCentavos))
  const teto = tetoDoEixo(maximo)
  const linhas = [teto, teto * 0.75, teto * 0.5, teto * 0.25, 0]

  const mesSobre = sobre === null ? null : meses[sobre]

  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-44">
        {linhas.map((v, i) => (
          <div
            key={i}
            className="absolute inset-x-0 flex items-center gap-2"
            style={{ top: `${(i / (linhas.length - 1)) * 100}%` }}
          >
            <div className="h-px flex-1 bg-slate-100" />
            <span className="w-16 shrink-0 text-right text-[10px] tabular-nums text-slate-400">
              {rotuloEixo(v)}
            </span>
          </div>
        ))}

        <div className="absolute inset-0 flex items-end gap-1 pr-[72px]">
          {meses.map((m, i) => {
            const alturaTotal = teto > 0 ? (m.totalCentavos / teto) * 100 : 0
            const fatiaRecebida =
              m.totalCentavos > 0 ? (m.recebidoCentavos / m.totalCentavos) * 100 : 0
            const ativo = m.competencia === selecionado
            const destacado = ativo || sobre === i

            return (
              <button
                key={m.competencia}
                onClick={() => onSelecionar(m.competencia)}
                onMouseEnter={() => setSobre(i)}
                onMouseLeave={() => setSobre(null)}
                onFocus={() => setSobre(i)}
                onBlur={() => setSobre(null)}
                aria-label={`${m.rotulo}: total ${formatCentavos(m.totalCentavos)}`}
                className="flex h-full flex-1 flex-col justify-end"
              >
                <motion.div
                  initial={reduzirMovimento ? false : { height: 0 }}
                  animate={{ height: `${alturaTotal}%` }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  // Programado é a parte clara no topo; recebido, a escura
                  // embaixo — a mesma leitura do painel do Airbnb.
                  className={`flex w-full flex-col justify-end overflow-hidden rounded-t-md transition-opacity ${
                    destacado ? 'opacity-100' : 'opacity-70'
                  }`}
                  style={{ background: '#fbcfe8' }}
                >
                  <div
                    className="w-full rounded-t-sm bg-slate-900"
                    style={{ height: `${fatiaRecebida}%` }}
                  />
                </motion.div>
              </button>
            )
          })}
        </div>

        <AnimatePresence>
          {mesSobre && (
            <motion.div
              initial={reduzirMovimento ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.12 }}
              // pointer-events-none: a caixa não pode roubar o hover da barra,
              // senão ela pisca enquanto o mouse anda por cima dela.
              className="pointer-events-none absolute z-10 w-52 rounded-xl bg-slate-900 p-3 text-white shadow-lg"
              style={{
                bottom: '100%',
                marginBottom: 8,
                // Centraliza na barra, mas gruda nas pontas quando o mês está
                // perto da borda — senão a caixa vaza para fora do cartão.
                left:
                  sobre !== null && sobre <= 2
                    ? 0
                    : sobre !== null && sobre >= 9
                      ? undefined
                      : `calc(${((sobre! + 0.5) / meses.length) * 100}% - 104px)`,
                right: sobre !== null && sobre >= 9 ? 72 : undefined,
              }}
            >
              <span className="text-xs capitalize text-slate-300">
                {rotuloCompetencia(mesSobre.competencia)}
              </span>

              <div className="mt-2 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-4 text-xs">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-white" />
                    Recebido
                  </span>
                  <span className="tabular-nums">
                    {formatCentavos(mesSobre.recebidoCentavos)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 text-xs">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: '#fbcfe8' }}
                    />
                    Programado
                  </span>
                  <span className="tabular-nums">
                    {formatCentavos(mesSobre.programadoCentavos)}
                  </span>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between gap-4 border-t border-white/15 pt-2 text-xs">
                <span className="text-slate-300">Total</span>
                <span className="tabular-nums">{formatCentavos(mesSobre.totalCentavos)}</span>
              </div>

              {mesSobre.saidasCentavos > 0 && (
                <div className="mt-1.5 flex items-center justify-between gap-4 text-xs">
                  <span className="text-slate-300">Gastos</span>
                  <span className="tabular-nums text-red-300">
                    − {formatCentavos(mesSobre.saidasCentavos)}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex gap-1 pr-[72px]">
        {meses.map((m, i) => {
          const ativo = m.competencia === selecionado
          return (
            <button
              key={m.competencia}
              onClick={() => onSelecionar(m.competencia)}
              onMouseEnter={() => setSobre(i)}
              onMouseLeave={() => setSobre(null)}
              className={`flex-1 rounded-full py-1 text-[10px] transition-colors ${
                ativo ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              {m.rotulo}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-4 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-slate-900" /> recebido
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: '#fbcfe8' }} />{' '}
          programado
        </span>
      </div>
    </div>
  )
}
