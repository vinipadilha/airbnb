'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { ModalGastoFixo } from '@/components/ModalGastoFixo'
import { Navegacao } from '@/components/Navegacao'
import { formatCentavos } from '@/lib/dinheiro'
import { buscarJson } from '@/lib/rede'
import type { Categoria, GastoFixo } from '@/lib/tipos'

export default function Fixos() {
  const [fixos, setFixos] = useState<GastoFixo[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [nomeSocio, setNomeSocio] = useState('Sócio')
  const [pendentesIds, setPendentesIds] = useState<Set<string>>(new Set())
  const [erro, setErro] = useState<string | null>(null)

  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<GastoFixo | null>(null)
  // Muda a cada abertura para remontar o modal: o estado dos campos vem das
  // props só na primeira renderização.
  const [aberturas, setAberturas] = useState(0)

  /** Incrementar força rebuscar, depois de salvar algo. */
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    let ativo = true
    type Mes = { categorias: Categoria[]; configuracoes?: { nomeSocio: string } }

    Promise.all([
      buscarJson<GastoFixo[]>('/api/gastos-fixos'),
      buscarJson<Mes>('/api/mes'),
      // A fila é complemento: se falhar, a lista de fixos aparece mesmo assim.
      buscarJson<{ pendentes: GastoFixo[] }>('/api/pendencias').catch(() => null),
    ])
      .then(([fixosLidos, mes, pend]) => {
        if (!ativo) return
        setFixos(fixosLidos)
        setCategorias(mes.categorias)
        if (mes.configuracoes) setNomeSocio(mes.configuracoes.nomeSocio)
        // Quem não está pendente já foi lançado neste mês.
        if (pend) setPendentesIds(new Set(pend.pendentes.map((p) => p.id)))
        setErro(null)
      })
      .catch(() => {
        if (ativo) setErro('Não foi possível carregar.')
      })
    return () => {
      ativo = false
    }
  }, [versao])

  function abrir(gastoFixo: GastoFixo | null) {
    setEditando(gastoFixo)
    setAberturas((n) => n + 1)
    setModalAberto(true)
  }

  const nomeCategoria = (id: string) => categorias.find((c) => c.id === id)?.nome ?? '—'
  const corCategoria = (id: string) => categorias.find((c) => c.id === id)?.cor ?? '#cbd5e1'

  return (
    <>
      <Navegacao />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Gastos fixos</h1>
        <button
          onClick={() => abrir(null)}
          className="bg-marca-gradiente rounded-xl px-4 py-2 text-sm font-medium text-branco shadow-sm transition-transform active:scale-[0.98]"
        >
          Adicionar
        </button>
      </div>

      {erro && <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{erro}</p>}

      {fixos.length === 0 && !erro && (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-slate-500">Nenhum gasto fixo cadastrado.</p>
          <p className="text-xs text-slate-400">
            Cadastre os que se repetem todo mês, como internet e condomínio.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {fixos.map((f, i) => (
          <motion.button
            key={f.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
            onClick={() => abrir(f)}
            className="flex items-center justify-between rounded-2xl bg-white p-4 text-left shadow-sm"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: corCategoria(f.categoriaId) }}
              />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm">{f.nome}</span>
                <span className="text-xs text-slate-400">
                  {nomeCategoria(f.categoriaId)} ·{' '}
                  {pendentesIds.has(f.id) ? (
                    <span className="text-amber-600">pendente neste mês</span>
                  ) : (
                    <span className="text-emerald-600">lançado neste mês</span>
                  )}
                </span>
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="text-sm tabular-nums text-slate-600">
                {formatCentavos(f.valorReferenciaCentavos)}
              </span>
              <span className="text-slate-300">›</span>
            </span>
          </motion.button>
        ))}
      </div>

      <ModalGastoFixo
        key={`${editando?.id ?? 'novo'}-${aberturas}`}
        aberto={modalAberto}
        gastoFixo={editando}
        categorias={categorias}
        nomeSocio={nomeSocio}
        onFechar={() => setModalAberto(false)}
        onSalvo={() => setVersao((v) => v + 1)}
      />
    </>
  )
}
