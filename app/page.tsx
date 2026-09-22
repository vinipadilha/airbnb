'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CardPendencias } from '@/components/CardPendencias'
import { CardRateio } from '@/components/CardRateio'
import { CartoesTotais } from '@/components/CartoesTotais'
import { Extrato } from '@/components/Extrato'
import { GraficoCategorias } from '@/components/GraficoCategorias'
import { ModalLancamento } from '@/components/ModalLancamento'
import { Navegacao } from '@/components/Navegacao'
import { SeletorMes } from '@/components/SeletorMes'
import { competenciaAtual, deslocarCompetencia } from '@/lib/competencia'
import type { DiaDoMes, Ocupacao } from '@/lib/calendario'
import type { Rateio } from '@/lib/rateio'
import type {
  Categoria,
  Configuracoes,
  GastoFixo,
  Lancamento,
  Repasse,
} from '@/lib/tipos'
import type { TotalCategoria, TotaisMes } from '@/lib/totais'

type DadosMes = {
  competencia: string
  lancamentos: Lancamento[]
  dias: DiaDoMes[]
  ocupacao: Ocupacao
  diariaMediaCentavos: number
  totais: TotaisMes
  rateio: Rateio
  configuracoes: Configuracoes
  repasses: Repasse[]
  saldoTotalCentavos: number
  porCategoria: TotalCategoria[]
  categorias: Categoria[]
}

export default function Dashboard() {
  const [competencia, setCompetencia] = useState(competenciaAtual())
  const [direcao, setDirecao] = useState<1 | -1>(1)
  const [dados, setDados] = useState<DadosMes | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  /**
   * Meses já buscados, por competência.
   *
   * Sem cache, trocar de mês disparava a animação na hora e os dados só
   * chegavam ~300ms depois: via-se o mês novo com os números do antigo e
   * depois a troca — a "piscada". Com o mês em memória, a troca é síncrona.
   */
  const cache = useRef(new Map<string, DadosMes>())
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Lancamento | null>(null)
  // Incrementa a cada abertura. Ver a explicação na key do ModalLancamento.
  const [aberturas, setAberturas] = useState(0)
  const [pendentes, setPendentes] = useState<GastoFixo[]>([])
  const [falhasPendencias, setFalhasPendencias] = useState<string[]>([])

  /** Busca um mês e guarda no cache. Devolve null se falhar. */
  const buscarMes = useCallback(async (alvo: string): Promise<DadosMes | null> => {
    try {
      const resposta = await fetch(`/api/mes?competencia=${alvo}`)
      if (!resposta.ok) return null
      const corpo = (await resposta.json()) as DadosMes
      cache.current.set(alvo, corpo)
      return corpo
    } catch {
      return null
    }
  }, [])

  /** Deixa os meses vizinhos prontos, para a próxima seta não esperar rede. */
  const prefetchVizinhos = useCallback(
    (base: string) => {
      for (const vizinho of [deslocarCompetencia(base, -1), deslocarCompetencia(base, 1)]) {
        if (!cache.current.has(vizinho)) void buscarMes(vizinho)
      }
    },
    [buscarMes],
  )

  const carregar = useCallback(
    async (opcoes?: { revalidar?: boolean }) => {
      setErro(null)

      const emCache = cache.current.get(competencia)
      if (emCache && !opcoes?.revalidar) {
        setDados(emCache)
        prefetchVizinhos(competencia)
        return
      }

      const novo = await buscarMes(competencia)
      if (novo === null) {
        // Nunca tela branca: o que já estava carregado continua valendo.
        setErro('Não foi possível carregar. Verifique a conexão.')
        return
      }
      setDados(novo)
      prefetchVizinhos(competencia)
    },
    [competencia, buscarMes, prefetchVizinhos],
  )

  /** Depois de gravar algo, o cache inteiro fica velho: totais e saldo mudam. */
  const recarregarTudo = useCallback(async () => {
    cache.current.clear()
    await carregar({ revalidar: true })
  }, [carregar])

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

      <SeletorMes
        competencia={competencia}
        carregando={dados !== null && dados.competencia !== competencia}
        onMudar={mudarMes}
      />

      {erro && (
        <div className="flex items-center justify-between rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
          <span>{erro}</span>
          <button onClick={() => void carregar({ revalidar: true })} className="underline">
            Tentar de novo
          </button>
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          // A animação dispara pela competência DOS DADOS, não pela pedida:
          // num mês ainda não carregado, a tela fica parada até a resposta
          // chegar e então desliza já com os números certos. Animar pela
          // pedida mostraria o mês novo com os números do antigo.
          key={dados?.competencia ?? competencia}
          initial={{ opacity: 0, x: direcao * 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direcao * -24 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="flex flex-col gap-6"
        >
          {dados && (
            // Uma coluna no celular; a partir de lg, duas — senao o conteudo
            // vira uma faixa estreita no meio de uma tela de 1440px.
            // min-w-0 nas colunas: item de grid tem min-width:auto e se recusa
            // a encolher abaixo do conteudo minimo. Sem isso, uma descricao
            // longa no extrato empurrava a coluna para 397px dentro de uma
            // grade de 339px, e o celular ganhava rolagem horizontal.
            <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
              <div className="flex min-w-0 flex-col gap-6">
                <CartoesTotais
                  totais={dados.totais}
                  saldoTotalCentavos={dados.saldoTotalCentavos}
                />
                <CardRateio
                  rateio={dados.rateio}
                  configuracoes={dados.configuracoes}
                  repasses={dados.repasses}
                  competencia={dados.competencia}
                  onMudou={() => void recarregarTudo()}
                />
                <GraficoCategorias
                  porCategoria={dados.porCategoria}
                  categorias={dados.categorias}
                />

                {/* Calendário de ocupação — desligado a pedido do dono em
                    2026-09-20, que preferiu manter o app como controle de
                    entradas e saídas. Para religar: descomente as duas linhas
                    abaixo e o import de CalendarioMes no topo. O endpoint
                    /api/mes já devolve `dias` e `ocupacao`, e o componente
                    continua em components/CalendarioMes.tsx, testado.

                <CalendarioMes dias={dados.dias} ocupacao={dados.ocupacao} />
                */}
              </div>
              <div className="flex min-w-0 flex-col gap-6">
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
        nomeSocio={dados?.configuracoes.nomeSocio ?? 'Sócio'}
        onFechar={() => setModalAberto(false)}
        onSalvo={() => void recarregarTudo()}
      />
    </>
  )
}
