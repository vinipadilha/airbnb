'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Indicador } from '@/components/Indicador'
import { ModalLancamento } from '@/components/ModalLancamento'
import { Navegacao } from '@/components/Navegacao'
import { SeletorMes } from '@/components/SeletorMes'
import { ValorAnimado } from '@/components/ValorAnimado'
import {
  segmentosDaSemana,
  semanasDoMes,
  type Ocupacao,
} from '@/lib/calendario'
import { competenciaAtual, hojeEmSaoPaulo } from '@/lib/competencia'
import { formatCentavos } from '@/lib/dinheiro'
import { buscarJson } from '@/lib/rede'
import type { Categoria, Configuracoes, Lancamento } from '@/lib/tipos'

type Dados = {
  competencia: string
  reservas: Lancamento[]
  ocupacao: Ocupacao
  faturamento: {
    recebidoCentavos: number
    programadoCentavos: number
    estimadoCentavos: number
  }
  diariaMediaCentavos: number
  checkInsNoMes: number
  categorias: Categoria[]
  configuracoes: Configuracoes
}

const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

/** Altura de uma faixa de reserva, e o espaço que ela reserva na célula. */
const ALTURA_FAIXA = 22

export default function Calendario() {
  const hoje = hojeEmSaoPaulo()
  const [competencia, setCompetencia] = useState(competenciaAtual())
  const [direcao, setDirecao] = useState<1 | -1>(1)
  const [dados, setDados] = useState<Dados | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [editando, setEditando] = useState<Lancamento | null>(null)
  const [aberturas, setAberturas] = useState(0)
  /** Incrementar força rebuscar o mês, depois de salvar algo. */
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    // `ativo` descarta a resposta de um mês que o usuário já deixou para trás.
    let ativo = true
    buscarJson<Dados>(`/api/calendario?competencia=${competencia}`)
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
  }, [competencia, versao])

  function abrir(id: string) {
    const r = dados?.reservas.find((x) => x.id === id)
    if (!r) return
    setEditando(r)
    setAberturas((n) => n + 1)
  }

  const semanas = semanasDoMes(competencia)

  return (
    <>
      <Navegacao />

      <SeletorMes
        competencia={competencia}
        carregando={dados !== null && dados.competencia !== competencia}
        onMudar={(nova, dir) => {
          setDirecao(dir)
          setCompetencia(nova)
        }}
      />

      {erro && <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{erro}</p>}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={dados?.competencia ?? competencia}
          initial={{ opacity: 0, x: direcao * 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direcao * -24 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="flex flex-col gap-6"
        >
          {dados && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <Indicador
                  rotulo="Faturamento do mês"
                  valor={<ValorAnimado centavos={dados.faturamento.estimadoCentavos} />}
                  tom="positivo"
                  detalhe={
                    dados.faturamento.programadoCentavos > 0
                      ? `${formatCentavos(dados.faturamento.recebidoCentavos)} recebido`
                      : 'tudo recebido'
                  }
                />
                <div className="flex min-w-0 flex-col gap-2 rounded-3xl bg-white p-4 shadow-sm sm:p-5">
                  <span className="text-xs text-slate-500">Ocupação</span>
                  <span className="text-xl font-semibold tracking-tight tabular-nums">
                    {dados.ocupacao.percentual}%
                  </span>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <motion.div
                      className="bg-marca-gradiente h-full rounded-full"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: dados.ocupacao.percentual / 100 }}
                      style={{ transformOrigin: 'left' }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                    />
                  </div>
                </div>
                <Indicador
                  rotulo="Diária média"
                  valor={
                    dados.diariaMediaCentavos > 0
                      ? formatCentavos(dados.diariaMediaCentavos)
                      : '—'
                  }
                  detalhe="por noite ocupada"
                />
                <Indicador
                  rotulo="Noites livres"
                  valor={dados.ocupacao.diasNoMes - dados.ocupacao.noitesOcupadas}
                  detalhe={`${dados.ocupacao.noitesOcupadas} de ${dados.ocupacao.diasNoMes} ocupadas · ${dados.checkInsNoMes} ${dados.checkInsNoMes === 1 ? 'check-in' : 'check-ins'}`}
                />
              </div>

              <div className="flex flex-col gap-1 rounded-3xl bg-white p-3 shadow-sm sm:p-5">
                <div className="grid grid-cols-7">
                  {SEMANA.map((l, i) => (
                    <span key={i} className="pb-2 text-center text-[11px] text-slate-400">
                      {l}
                    </span>
                  ))}
                </div>

                {(() => {
                  // Reservas cujo nome já apareceu neste mês. O nome vai no
                  // primeiro pedaço VISÍVEL, não só no do check-in: uma
                  // estadia que começou no mês anterior apareceria como uma
                  // faixa anônima no começo deste.
                  const jaNomeadas = new Set<string>()
                  return semanas.map((semana, iSemana) => {
                  const segmentos = segmentosDaSemana(dados.reservas, semana).map((s) => {
                    const nomear = !jaNomeadas.has(s.lancamentoId)
                    jaNomeadas.add(s.lancamentoId)
                    return { ...s, nomear }
                  })
                  const faixas = Math.max(1, ...segmentos.map((s) => s.faixa + 1))

                  return (
                    <div key={iSemana} className="relative">
                      {/* Células com o número do dia. A altura reserva espaço
                          para quantas faixas de reserva a semana tiver. */}
                      <div className="grid grid-cols-7 gap-1">
                        {semana.map((data, col) => (
                          <div
                            key={col}
                            className={`flex flex-col rounded-lg border border-slate-100 p-1.5 ${
                              data === null ? 'border-transparent' : ''
                            } ${data === hoje ? 'ring-2 ring-inset ring-amber-400' : ''}`}
                            style={{ minHeight: 36 + faixas * (ALTURA_FAIXA + 4) }}
                          >
                            {data && (
                              <span
                                className={`text-xs tabular-nums ${
                                  data < hoje ? 'text-slate-300' : 'text-slate-500'
                                }`}
                              >
                                {Number(data.slice(8))}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Faixas das reservas, por cima das células. */}
                      <div className="pointer-events-none absolute inset-x-0 top-7 grid grid-cols-7 gap-x-1">
                        {segmentos.map((s) => (
                          <button
                            key={`${s.lancamentoId}-${iSemana}`}
                            onClick={() => abrir(s.lancamentoId)}
                            title={s.descricao}
                            className={`pointer-events-auto flex items-center overflow-hidden px-2 text-left text-[11px] font-medium transition-opacity hover:opacity-90 ${
                              s.recebido
                                ? 'bg-marca-gradiente text-branco shadow-sm'
                                : 'border border-dashed border-marca/60 bg-marca/10 text-marca'
                            } ${s.comecaAqui ? 'rounded-l-full' : ''} ${
                              s.terminaAqui ? 'rounded-r-full' : ''
                            }`}
                            style={{
                              gridColumn: `${s.colInicio + 1} / ${s.colFim + 1}`,
                              gridRow: s.faixa + 1,
                              height: ALTURA_FAIXA,
                              marginTop: s.faixa === 0 ? 0 : 4,
                            }}
                          >
                            {s.nomear && <span className="truncate">{s.descricao}</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                  })
                })()}

                <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="bg-marca-gradiente h-2.5 w-4 rounded-full" /> recebido
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-4 rounded-full border border-dashed border-marca/60 bg-marca/10" />{' '}
                    programado
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded ring-2 ring-inset ring-amber-400" /> hoje
                  </span>
                </div>
              </div>

              {dados.reservas.length > 0 && (
                <div className="flex flex-col gap-2">
                  {dados.reservas.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => abrir(r.id)}
                      className="flex items-center justify-between rounded-2xl bg-white p-4 text-left shadow-sm transition-transform active:scale-[0.99]"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-sm">{r.descricao}</span>
                        <span className="text-xs text-slate-400">
                          {r.data.slice(8)}/{r.data.slice(5, 7)} →{' '}
                          {r.dataFim?.slice(8)}/{r.dataFim?.slice(5, 7)}
                          {!r.recebido && ' · programado'}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span
                          className={`text-sm tabular-nums ${
                            r.recebido ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        >
                          {formatCentavos(r.valorCentavos)}
                        </span>
                        <span className="text-slate-300">›</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {dados && (
        <ModalLancamento
          key={`${editando?.id ?? 'novo'}-${aberturas}`}
          aberto={editando !== null}
          categorias={dados.categorias}
          lancamento={editando}
          nomeSocio={dados.configuracoes.nomeSocio}
          onFechar={() => setEditando(null)}
          onSalvo={() => setVersao((v) => v + 1)}
        />
      )}
    </>
  )
}
