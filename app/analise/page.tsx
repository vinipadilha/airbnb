'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { GraficoAno } from '@/components/GraficoAno'
import { Navegacao } from '@/components/Navegacao'
import { ValorAnimado } from '@/components/ValorAnimado'
import type { MesDoAno } from '@/lib/analise'
import { competenciaAtual, rotuloCompetencia } from '@/lib/competencia'
import { formatCentavos } from '@/lib/dinheiro'

type TotaisAno = {
  recebidoCentavos: number
  programadoCentavos: number
  saidasCentavos: number
  saldoCentavos: number
}

type Resposta = { ano: number; meses: MesDoAno[]; totais: TotaisAno }

export default function Analise() {
  const hoje = competenciaAtual()
  const [ano, setAno] = useState(Number(hoje.slice(0, 4)))
  const [selecionado, setSelecionado] = useState(hoje)
  const [dados, setDados] = useState<Resposta | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setErro(null)
    try {
      const resposta = await fetch(`/api/analise?ano=${ano}`)
      if (!resposta.ok) throw new Error('falhou')
      setDados((await resposta.json()) as Resposta)
    } catch {
      setErro('Não foi possível carregar.')
    }
  }, [ano])

  useEffect(() => {
    void carregar()
  }, [carregar])

  function mudarAno(delta: 1 | -1) {
    const novo = ano + delta
    setAno(novo)
    // Segue para o mesmo mês do ano novo, senão o detalhe abaixo fica falando
    // de um mês que não está mais no gráfico.
    setSelecionado(`${novo}-${selecionado.slice(5)}`)
  }

  const mes = dados?.meses.find((m) => m.competencia === selecionado) ?? null

  return (
    <>
      <Navegacao />

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">Análise</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => mudarAno(-1)}
            aria-label="Ano anterior"
            className="rounded-full px-3 py-1 text-slate-400 transition-colors hover:text-slate-900"
          >
            ‹
          </button>
          <span className="w-12 text-center text-sm font-medium tabular-nums">{ano}</span>
          <button
            onClick={() => mudarAno(1)}
            aria-label="Próximo ano"
            className="rounded-full px-3 py-1 text-slate-400 transition-colors hover:text-slate-900"
          >
            ›
          </button>
        </div>
      </div>

      {erro && <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{erro}</p>}

      {dados && (
        <>
          <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm">
            <span className="text-xs text-slate-500">Faturamento por mês</span>
            <GraficoAno
              meses={dados.meses}
              selecionado={selecionado}
              onSelecionar={setSelecionado}
            />
          </div>

          <AnimatePresence mode="wait">
            {mes && (
              <motion.div
                key={mes.competencia}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm"
              >
                <span className="text-sm font-medium capitalize">
                  {rotuloCompetencia(mes.competencia)}
                </span>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="h-2 w-2 rounded-full bg-slate-900" />
                      Recebido
                    </span>
                    <ValorAnimado centavos={mes.recebidoCentavos} className="text-lg" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: '#fbcfe8' }}
                      />
                      Programado
                    </span>
                    <ValorAnimado centavos={mes.programadoCentavos} className="text-lg" />
                  </div>
                  <div className="col-span-2 flex flex-col gap-1 border-t border-slate-100 pt-3 sm:col-span-1 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                    <span className="text-xs text-slate-500">Total do mês</span>
                    <ValorAnimado centavos={mes.totalCentavos} className="text-lg" />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="flex flex-col">
                    <span className="text-xs text-slate-500">Saldo do mês</span>
                    <span className="text-[11px] text-slate-400">
                      recebido menos {formatCentavos(mes.saidasCentavos)} de gastos
                    </span>
                  </span>
                  <span
                    className={`text-xl tabular-nums ${
                      mes.saldoCentavos < 0 ? 'text-red-600' : 'text-slate-900'
                    }`}
                  >
                    {formatCentavos(mes.saldoCentavos)}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm">
            <span className="text-xs text-slate-500">Ano de {ano}</span>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-500">Recebido</span>
                <span className="text-lg tabular-nums text-emerald-600">
                  {formatCentavos(dados.totais.recebidoCentavos)}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-500">Gastos</span>
                <span className="text-lg tabular-nums text-red-600">
                  {formatCentavos(dados.totais.saidasCentavos)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-xs text-slate-500">Saldo do ano</span>
              <span
                className={`text-xl tabular-nums ${
                  dados.totais.saldoCentavos < 0 ? 'text-red-600' : 'text-slate-900'
                }`}
              >
                {formatCentavos(dados.totais.saldoCentavos)}
              </span>
            </div>
            {dados.totais.programadoCentavos > 0 && (
              <span className="text-[11px] text-slate-400">
                mais {formatCentavos(dados.totais.programadoCentavos)} programado, ainda
                a receber
              </span>
            )}
          </div>
        </>
      )}
    </>
  )
}
