'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import type { Categoria, GastoFixo } from '@/lib/tipos'
import { CampoValor } from './CampoValor'

type Props = {
  aberto: boolean
  gastoFixo: GastoFixo | null
  categorias: Categoria[]
  onFechar: () => void
  onSalvo: () => void
}

export function ModalGastoFixo({ aberto, gastoFixo, categorias, onFechar, onSalvo }: Props) {
  const [nome, setNome] = useState(gastoFixo?.nome ?? '')
  const [valorCentavos, setValorCentavos] = useState<number | null>(
    gastoFixo?.valorReferenciaCentavos ?? null,
  )
  const [categoriaId, setCategoriaId] = useState(gastoFixo?.categoriaId ?? '')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const ativas = categorias.filter((c) => !c.arquivada)

  async function salvar() {
    if (nome.trim() === '') {
      setErro('Informe o nome.')
      return
    }
    if (valorCentavos === null) {
      setErro('Informe um valor maior que zero.')
      return
    }
    if (categoriaId === '') {
      setErro('Escolha uma categoria.')
      return
    }

    setSalvando(true)
    setErro(null)

    const corpo = { nome: nome.trim(), valorReferenciaCentavos: valorCentavos, categoriaId }
    const resposta = await fetch(
      gastoFixo ? `/api/gastos-fixos/${gastoFixo.id}` : '/api/gastos-fixos',
      {
        method: gastoFixo ? 'PATCH' : 'POST',
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

  async function remover() {
    if (!gastoFixo) return
    if (
      !confirm(
        `Remover "${gastoFixo.nome}"? Os lançamentos já feitos continuam no histórico.`,
      )
    ) {
      return
    }

    const resposta = await fetch(`/api/gastos-fixos/${gastoFixo.id}`, { method: 'DELETE' })
    if (!resposta.ok) {
      setErro('Não foi possível remover.')
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
            className="flex w-full max-w-md flex-col gap-4 rounded-t-3xl bg-white p-6 sm:rounded-3xl"
          >
            <span className="text-sm font-medium">
              {gastoFixo ? 'Editar gasto fixo' : 'Novo gasto fixo'}
            </span>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Nome</span>
              <input
                autoFocus={!gastoFixo}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="ex: Condomínio"
                className="rounded-xl bg-slate-100 px-4 py-3 outline-none"
              />
            </label>

            <CampoValor valorCentavos={valorCentavos} onChange={setValorCentavos} />

            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Categoria</span>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="rounded-xl bg-slate-100 px-4 py-3 outline-none"
              >
                <option value="">Escolha…</option>
                {ativas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>

            <p className="text-xs text-slate-400">
              O valor é só referência: todo mês o app sugere este número e você ajusta
              antes de confirmar.
            </p>

            {erro && <p className="text-sm text-red-600">{erro}</p>}

            <div className="flex gap-3">
              {gastoFixo && (
                <button onClick={remover} className="rounded-xl px-4 py-3 text-sm text-red-600">
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
