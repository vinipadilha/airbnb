'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { GraficoAno } from '@/components/GraficoAno'
import { GraficoOcupacao } from '@/components/GraficoOcupacao'
import { Indicador } from '@/components/Indicador'
import { Navegacao } from '@/components/Navegacao'
import { ValorAnimado } from '@/components/ValorAnimado'
import type { MesDoAno, OcupacaoDoAno } from '@/lib/analise'
import { competenciaAtual, rotuloCompetencia } from '@/lib/competencia'
import { formatCentavos } from '@/lib/dinheiro'
import { buscarJson } from '@/lib/rede'

type TotaisAno = {
  recebidoCentavos: number
  programadoCentavos: number
  saidasCentavos: number
  saldoCentavos: number
}

type Resposta = {
  ano: number
  meses: MesDoAno[]
  totais: TotaisAno
  ocupacao: OcupacaoDoAno[]
}

export default function Analise() {
  const hoje = competenciaAtual()
  const [ano, setAno] = useState(Number(hoje.slice(0, 4)))
  const [selecionado, setSelecionado] = useState(hoje)
  const [dados, setDados] = useState<Resposta | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    // `ativo` descarta respostas velhas: trocando de ano rápido, a resposta
    // do ano anterior pode chegar depois e sobrescrever a tela com os números
    // errados. O setState acontece só no callback da promessa, nunca no corpo
    // do efeito.
    let ativo = true
    buscarJson<Resposta>(`/api/analise?ano=${ano}`)
      .then((d) => {
        if (!ativo) return
        setDados(d)
        setErro(null)
      })
      .catch(() => {
        if (ativo) setErro('Não foi possível carregar.')
      })
    return () => {
      ativo = false
    }
  }, [ano])

  function mudarAno(delta: 1 | -1) {
    const novo = ano + delta
    setAno(novo)
    // Segue para o mesmo mês do ano novo, senão o detalhe abaixo fica falando
    // de um mês que não está mais no gráfico.
    setSelecionado(`${novo}-${selecionado.slice(5)}`)
  }

  const mes = dados?.meses.find((m) => m.competencia === selecionado) ?? null
  const ocupacaoMes = dados?.ocupacao.find((m) => m.competencia === selecionado) ?? null

  const comReserva = dados?.ocupacao.filter((m) => m.noitesOcupadas > 0) ?? []
  const ocupacaoMedia =
    comReserva.length === 0
      ? null
      : Math.round(comReserva.reduce((t, m) => t + m.percentual, 0) / comReserva.length)

  return (
    <>
      <Navegacao />

      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold tracking-tight">Análise</h1>
          <span className="text-xs text-slate-400">Faturamento e ocupação ao longo do ano</span>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-white p-1 shadow-sm">
          <button
            onClick={() => mudarAno(-1)}
            aria-label="Ano anterior"
            className="h-8 w-8 rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            ‹
          </button>
          <span className="w-12 text-center text-sm font-semibold tabular-nums">{ano}</span>
          <button
            onClick={() => mudarAno(1)}
            aria-label="Próximo ano"
            className="h-8 w-8 rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            ›
          </button>
        </div>
      </div>

      {erro && <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{erro}</p>}

      {dados && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Indicador
              rotulo={`Recebido em ${ano}`}
              valor={formatCentavos(dados.totais.recebidoCentavos)}
              tom="positivo"
              detalhe={
                dados.totais.programadoCentavos > 0
                  ? `+ ${formatCentavos(dados.totais.programadoCentavos)} programado`
                  : undefined
              }
            />
            <Indicador
              rotulo="Gastos"
              valor={formatCentavos(dados.totais.saidasCentavos)}
              tom="negativo"
            />
            <Indicador
              rotulo="Saldo do ano"
              valor={formatCentavos(dados.totais.saldoCentavos)}
              tom={dados.totais.saldoCentavos < 0 ? 'negativo' : 'neutro'}
            />
            <Indicador
              rotulo="Ocupação média"
              valor={ocupacaoMedia === null ? '—' : `${ocupacaoMedia}%`}
              detalhe={
                comReserva.length > 0
                  ? `${comReserva.length} ${comReserva.length === 1 ? 'mês' : 'meses'} com reserva`
                  : 'nenhuma reserva no ano'
              }
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[3fr_2fr] lg:items-start">
            <div className="flex min-w-0 flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
              <span className="text-sm font-semibold">Faturamento por mês</span>
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
                  className="flex min-w-0 flex-col gap-5 rounded-3xl bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold capitalize">
                      {rotuloCompetencia(mes.competencia)}
                    </span>
                    {ocupacaoMes && ocupacaoMes.noitesOcupadas > 0 && (
                      <span className="rounded-full bg-marca/15 px-2.5 py-1 text-[11px] font-medium text-marca">
                        {ocupacaoMes.percentual}% ocupado
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500">Total do mês</span>
                    <ValorAnimado
                      centavos={mes.totalCentavos}
                      className="text-3xl font-semibold tracking-tight"
                    />
                  </div>

                  <div className="flex flex-col gap-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-slate-500">
                        <span className="bg-marca-gradiente h-2.5 w-2.5 rounded-full" />
                        Recebido
                      </span>
                      <span className="font-medium tabular-nums">
                        {formatCentavos(mes.recebidoCentavos)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-slate-500">
                        <span className="h-2.5 w-2.5 rounded-full bg-marca/40" />
                        Programado
                      </span>
                      <span className="font-medium tabular-nums">
                        {formatCentavos(mes.programadoCentavos)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-slate-500">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-600/60" />
                        Gastos
                      </span>
                      <span className="font-medium tabular-nums text-red-600">
                        − {formatCentavos(mes.saidasCentavos)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="flex flex-col">
                      <span className="text-xs text-slate-500">Saldo do mês</span>
                      <span className="text-[11px] text-slate-400">recebido menos gastos</span>
                    </span>
                    <span
                      className={`text-xl font-semibold tracking-tight tabular-nums ${
                        mes.saldoCentavos < 0 ? 'text-red-600' : 'text-slate-900'
                      }`}
                    >
                      {formatCentavos(mes.saldoCentavos)}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
            <GraficoOcupacao
              meses={dados.ocupacao}
              selecionado={selecionado}
              onSelecionar={setSelecionado}
            />
          </div>
        </>
      )}
    </>
  )
}
