'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { hojeEmSaoPaulo } from '@/lib/competencia'
import { noitesEntre, somarDias } from '@/lib/calendario'
import type { Categoria, Lancamento, TipoLancamento } from '@/lib/tipos'
import { formatCentavos } from '@/lib/dinheiro'
import { CampoValor } from './CampoValor'
import { SeletorPeriodo } from './SeletorPeriodo'

type Props = {
  aberto: boolean
  categorias: Categoria[]
  /** Preenchido quando está editando; null quando está criando. */
  lancamento: Lancamento | null
  onFechar: () => void
  onSalvo: () => void
}

/** 2026-09-21 -> 21/09 */
function rotuloCurto(data: string): string {
  const [, mes, dia] = data.split('-')
  return `${dia}/${mes}`
}

export function ModalLancamento({ aberto, categorias, lancamento, onFechar, onSalvo }: Props) {
  const [tipo, setTipo] = useState<TipoLancamento>(lancamento?.tipo ?? 'entrada')
  const [data, setData] = useState(lancamento?.data ?? hojeEmSaoPaulo())
  const [valorCentavos, setValorCentavos] = useState<number | null>(
    lancamento?.valorCentavos ?? null,
  )
  const [descricao, setDescricao] = useState(lancamento?.descricao ?? '')
  const [categoriaId, setCategoriaId] = useState(lancamento?.categoriaId ?? '')
  const [origem, setOrigem] = useState(lancamento?.origem ?? 'Airbnb')
  const [dataFim, setDataFim] = useState(
    lancamento?.dataFim ?? somarDias(lancamento?.data ?? hojeEmSaoPaulo(), 1),
  )
  const [hospedes, setHospedes] = useState(lancamento?.hospedes?.toString() ?? '')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const ativas = categorias.filter((c) => !c.arquivada)

  async function salvar() {
    if (valorCentavos === null) {
      setErro('Informe um valor maior que zero.')
      return
    }
    if (tipo === 'saida' && categoriaId === '') {
      setErro('Escolha uma categoria.')
      return
    }
    if (tipo === 'entrada' && dataFim <= data) {
      setErro('O check-out precisa ser depois do check-in.')
      return
    }

    setSalvando(true)
    setErro(null)

    const corpo = {
      tipo,
      data,
      valorCentavos,
      descricao,
      categoriaId: tipo === 'saida' ? categoriaId : null,
      origem: tipo === 'entrada' ? origem : null,
      dataFim: tipo === 'entrada' ? dataFim : null,
      hospedes: tipo === 'entrada' && hospedes !== '' ? Number(hospedes) : null,
    }

    const resposta = await fetch(
      lancamento ? `/api/lancamentos/${lancamento.id}` : '/api/lancamentos',
      {
        method: lancamento ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      },
    )

    setSalvando(false)

    if (!resposta.ok) {
      const c = (await resposta.json()) as { erro?: string }
      setErro(c.erro ?? 'Não foi possível salvar.')
      return
    }

    onSalvo()
    onFechar()
  }

  async function excluir() {
    if (!lancamento) return
    if (!confirm('Excluir este lançamento?')) return

    const resposta = await fetch(`/api/lancamentos/${lancamento.id}`, { method: 'DELETE' })
    if (!resposta.ok) {
      setErro('Não foi possível excluir.')
      return
    }
    onSalvo()
    onFechar()
  }

  return (
    <AnimatePresence>
      {aberto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onFechar}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[92dvh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-3xl bg-white p-6 sm:max-h-[90dvh] sm:rounded-3xl"
          >
            <div className="flex gap-2 rounded-xl bg-slate-100 p-1">
              {(['entrada', 'saida'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  className={`flex-1 rounded-lg py-2 text-sm transition-colors ${
                    tipo === t ? 'bg-white shadow-sm' : 'text-slate-500'
                  }`}
                >
                  {t === 'entrada' ? 'Entrada' : 'Saída'}
                </button>
              ))}
            </div>

            <CampoValor autoFocus valorCentavos={valorCentavos} onChange={setValorCentavos} />

            {tipo === 'entrada' ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-500">Período da estadia</span>
                  <span className="text-xs tabular-nums text-slate-400">
                    {rotuloCurto(data)} → {rotuloCurto(dataFim)}
                  </span>
                </div>
                <SeletorPeriodo
                  inicio={data}
                  fim={dataFim}
                  onChange={(inicio, fim) => {
                    setData(inicio)
                    setDataFim(fim)
                  }}
                />
                {valorCentavos !== null && dataFim > data && (
                  <span className="px-1 text-xs text-slate-400">
                    {formatCentavos(
                      Math.round(valorCentavos / noitesEntre(data, dataFim)),
                    )}{' '}
                    por noite
                  </span>
                )}
              </div>
            ) : (
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-500">Data</span>
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="rounded-xl bg-slate-100 px-4 py-3 outline-none"
                />
              </label>
            )}

            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Descrição</span>
              <input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder={tipo === 'entrada' ? 'Reserva 3 noites' : 'Compra de toalhas'}
                className="rounded-xl bg-slate-100 px-4 py-3 outline-none"
              />
            </label>

            {tipo === 'saida' ? (
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-500">Categoria</span>
                <select
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(e.target.value)}
                  className="rounded-xl bg-slate-100 px-4 py-3 outline-none"
                >
                  <option value="">Escolha…</option>
                  {ativas.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </label>
            ) : (
              <>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-500">Origem</span>
                  <input
                    value={origem}
                    onChange={(e) => setOrigem(e.target.value)}
                    className="rounded-xl bg-slate-100 px-4 py-3 outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-500">Hóspedes</span>
                  <input
                    inputMode="numeric"
                    value={hospedes}
                    onChange={(e) => setHospedes(e.target.value)}
                    className="rounded-xl bg-slate-100 px-4 py-3 tabular-nums outline-none"
                  />
                </label>
              </>
            )}

            {erro && <p className="text-sm text-red-600">{erro}</p>}

            <div className="flex gap-3">
              {lancamento && (
                <button onClick={excluir} className="rounded-xl px-4 py-3 text-sm text-red-600">
                  Excluir
                </button>
              )}
              <button
                onClick={salvar}
                disabled={salvando}
                className="flex-1 rounded-xl bg-slate-900 py-3 text-white disabled:opacity-40"
              >
                {salvando ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
