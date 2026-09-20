'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { CalendarioMes } from '@/components/CalendarioMes'
import { CardPendencias } from '@/components/CardPendencias'
import { CartoesTotais } from '@/components/CartoesTotais'
import { Extrato } from '@/components/Extrato'
import { GraficoCategorias } from '@/components/GraficoCategorias'
import { ModalLancamento } from '@/components/ModalLancamento'
import { Navegacao } from '@/components/Navegacao'
import { SeletorMes } from '@/components/SeletorMes'
import { competenciaAtual } from '@/lib/competencia'
import type { DiaDoMes, Ocupacao } from '@/lib/calendario'
import type { Categoria, GastoFixo, Lancamento } from '@/lib/tipos'
import type { TotalCategoria, TotaisMes } from '@/lib/totais'

type DadosMes = {
  competencia: string
  lancamentos: Lancamento[]
  dias: DiaDoMes[]
  ocupacao: Ocupacao
  diariaMediaCentavos: number
  totais: TotaisMes
  saldoTotalCentavos: number
  porCategoria: TotalCategoria[]
  categorias: Categoria[]
}

export default function Dashboard() {
  const [competencia, setCompetencia] = useState(competenciaAtual())
  const [direcao, setDirecao] = useState<1 | -1>(1)
  const [dados, setDados] = useState<DadosMes | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Lancamento | null>(null)
  // Incrementa a cada abertura. Ver a explicação na key do ModalLancamento.
  const [aberturas, setAberturas] = useState(0)
  const [pendentes, setPendentes] = useState<GastoFixo[]>([])
  const [falhasPendencias, setFalhasPendencias] = useState<string[]>([])

  const carregar = useCallback(async () => {
    setErro(null)
    try {
      const resposta = await fetch(`/api/mes?competencia=${competencia}`)
      if (!resposta.ok) throw new Error('resposta não ok')
      setDados((await resposta.json()) as DadosMes)
    } catch {
      // Spec §10: nunca tela branca. O que já estava carregado continua na tela.
      setErro('Não foi possível carregar. Verifique a conexão.')
    }
  }, [competencia])

  const carregarPendencias = useCallback(async () => {
    try {
      const resposta = await fetch('/api/pendencias')
      if (!resposta.ok) return
      const corpo = (await resposta.json()) as { pendentes: GastoFixo[] }
      setPendentes(corpo.pendentes)
    } catch {
      // Silencioso de propósito: a fila é um extra, não pode derrubar o dashboard.
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  useEffect(() => {
    void carregarPendencias()
  }, [carregarPendencias])

  function mudarMes(nova: string, dir: 1 | -1) {
    setDirecao(dir)
    setCompetencia(nova)
  }

  function abrirNovo() {
    setEditando(null)
    setAberturas((n) => n + 1)
    setModalAberto(true)
  }

  function abrirEdicao(lancamento: Lancamento) {
    setEditando(lancamento)
    setAberturas((n) => n + 1)
    setModalAberto(true)
  }

  return (
    <>
      <Navegacao />

      {competencia === competenciaAtual() && (
        <>
          <CardPendencias
            key={pendentes.map((p) => p.id).join(',')}
            pendentes={pendentes}
            competencia={competencia}
            onLancado={(falhas) => {
              setFalhasPendencias(falhas)
              void carregar()
              void carregarPendencias()
            }}
          />
          {falhasPendencias.length > 0 && (
            <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
              {falhasPendencias.map((f) => (
                <p key={f}>{f}</p>
              ))}
            </div>
          )}
        </>
      )}

      <SeletorMes competencia={competencia} onMudar={mudarMes} />

      {erro && (
        <div className="flex items-center justify-between rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
          <span>{erro}</span>
          <button onClick={() => void carregar()} className="underline">
            Tentar de novo
          </button>
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={competencia}
          initial={{ opacity: 0, x: direcao * 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direcao * -24 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="flex flex-col gap-6"
        >
          {dados && (
            // Uma coluna no celular; a partir de lg, duas — senao o conteudo
            // vira uma faixa estreita no meio de uma tela de 1440px.
            <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
              <div className="flex flex-col gap-6">
                <CartoesTotais
                  totais={dados.totais}
                  saldoTotalCentavos={dados.saldoTotalCentavos}
                  diariaMediaCentavos={dados.diariaMediaCentavos}
                />
                <CalendarioMes dias={dados.dias} ocupacao={dados.ocupacao} />
              </div>
              <div className="flex flex-col gap-6">
                <GraficoCategorias
                  porCategoria={dados.porCategoria}
                  categorias={dados.categorias}
                />
                <Extrato
                  lancamentos={dados.lancamentos}
                  categorias={dados.categorias}
                  onEditar={abrirEdicao}
                />
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <button
        onClick={abrirNovo}
        aria-label="Novo lançamento"
        className="fixed bottom-20 right-6 z-40 h-14 w-14 rounded-full bg-slate-900 text-2xl text-white shadow-lg transition-transform active:scale-95 sm:bottom-8"
      >
        +
      </button>

      <ModalLancamento
        // A key remonta o modal a cada ABERTURA, não só a cada alvo diferente.
        // Só o id não bastaria: duas criações seguidas compartilhariam a key
        // 'novo', o componente não desmontaria, e a segunda abriria com o que
        // foi digitado na primeira (ver Task 16).
        key={`${editando?.id ?? 'novo'}-${aberturas}`}
        aberto={modalAberto}
        categorias={dados?.categorias ?? []}
        lancamento={editando}
        onFechar={() => setModalAberto(false)}
        onSalvo={() => void carregar()}
      />
    </>
  )
}
