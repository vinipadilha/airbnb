'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { MesDoAno } from '@/lib/analise'

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

  const maximo = Math.max(...meses.map((m) => m.totalCentavos))
  const teto = tetoDoEixo(maximo)
  const linhas = [teto, teto * 0.75, teto * 0.5, teto * 0.25, 0]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {/* Linhas de grade com os rótulos do eixo, como referência de escala. */}
        <div className="relative h-44 flex-1">
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
            {meses.map((m) => {
              const alturaTotal = teto > 0 ? (m.totalCentavos / teto) * 100 : 0
              const fatiaRecebida =
                m.totalCentavos > 0 ? (m.recebidoCentavos / m.totalCentavos) * 100 : 0
              const ativo = m.competencia === selecionado

              return (
                <button
                  key={m.competencia}
                  onClick={() => onSelecionar(m.competencia)}
                  aria-label={`${m.rotulo}: total ${m.totalCentavos / 100}`}
                  className="group flex h-full flex-1 flex-col justify-end"
                >
                  <motion.div
                    initial={reduzirMovimento ? false : { height: 0 }}
                    animate={{ height: `${alturaTotal}%` }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className={`flex w-full flex-col justify-end overflow-hidden rounded-t-md transition-opacity ${
                      // Programado é a parte clara no topo; recebido, a escura
                      // embaixo — a mesma leitura do painel do Airbnb.
                      ativo ? '' : 'opacity-70 group-hover:opacity-100'
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
        </div>
      </div>

      <div className="flex gap-1 pr-[72px]">
        {meses.map((m) => {
          const ativo = m.competencia === selecionado
          return (
            <button
              key={m.competencia}
              onClick={() => onSelecionar(m.competencia)}
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
