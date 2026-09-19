'use client'

import { motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { CampoValor } from '@/components/CampoValor'
import { Navegacao } from '@/components/Navegacao'
import { formatCentavos } from '@/lib/dinheiro'
import type { Categoria, GastoFixo } from '@/lib/tipos'

export default function Fixos() {
  const [fixos, setFixos] = useState<GastoFixo[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [pendentesIds, setPendentesIds] = useState<Set<string>>(new Set())
  const [editando, setEditando] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [valorCentavos, setValorCentavos] = useState<number | null>(null)
  const [categoriaId, setCategoriaId] = useState('')

  const carregar = useCallback(async () => {
    setErro(null)
    try {
      const [fixosRes, mesRes, pendRes] = await Promise.all([
        fetch('/api/gastos-fixos'),
        fetch('/api/mes'),
        fetch('/api/pendencias'),
      ])
      if (!fixosRes.ok || !mesRes.ok) throw new Error('falhou')
      setFixos((await fixosRes.json()) as GastoFixo[])
      setCategorias(((await mesRes.json()) as { categorias: Categoria[] }).categorias)

      // Quem não está pendente já foi lançado neste mês (spec §6).
      if (pendRes.ok) {
        const { pendentes } = (await pendRes.json()) as { pendentes: GastoFixo[] }
        setPendentesIds(new Set(pendentes.map((p) => p.id)))
      }
    } catch {
      setErro('Não foi possível carregar.')
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function adicionar() {
    if (nome.trim() === '' || valorCentavos === null || categoriaId === '') {
      setErro('Preencha nome, valor e categoria.')
      return
    }
    const resposta = await fetch('/api/gastos-fixos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, valorReferenciaCentavos: valorCentavos, categoriaId }),
    })
    if (!resposta.ok) {
      setErro('Não foi possível adicionar.')
      return
    }
    setNome('')
    setValorCentavos(null)
    setCategoriaId('')
    void carregar()
  }

  async function remover(id: string, nomeDoFixo: string) {
    if (!confirm(`Remover "${nomeDoFixo}"? Os lançamentos já feitos continuam no histórico.`)) {
      return
    }
    await fetch(`/api/gastos-fixos/${id}`, { method: 'DELETE' })
    void carregar()
  }

  async function salvarValor(id: string, centavos: number | null) {
    setEditando(null)
    if (centavos === null) return
    await fetch(`/api/gastos-fixos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valorReferenciaCentavos: centavos }),
    })
    void carregar()
  }

  const nomeCategoria = (id: string) => categorias.find((c) => c.id === id)?.nome ?? '—'

  return (
    <>
      <Navegacao />
      <h1 className="text-lg font-medium">Gastos fixos</h1>

      {erro && <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{erro}</p>}

      <div className="flex flex-col gap-2">
        {fixos.map((f, i) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
            className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
          >
            <span className="flex flex-col">
              <span className="text-sm">{f.nome}</span>
              <span className="text-xs text-slate-400">
                {nomeCategoria(f.categoriaId)} ·{' '}
                {pendentesIds.has(f.id) ? (
                  <span className="text-amber-600">pendente neste mês</span>
                ) : (
                  <span className="text-emerald-600">lançado neste mês</span>
                )}
              </span>
            </span>
            <span className="flex items-center gap-4">
              {editando === f.id ? (
                <span className="w-32">
                  <CampoValor
                    autoFocus
                    valorCentavos={f.valorReferenciaCentavos}
                    onChange={(c) => void salvarValor(f.id, c)}
                  />
                </span>
              ) : (
                <button
                  onClick={() => setEditando(f.id)}
                  aria-label={`Editar valor de ${f.nome}`}
                  className="text-sm tabular-nums text-slate-600 underline decoration-slate-200 underline-offset-4"
                >
                  {formatCentavos(f.valorReferenciaCentavos)}
                </button>
              )}
              <button
                onClick={() => void remover(f.id, f.nome)}
                aria-label={`Remover ${f.nome}`}
                className="text-slate-300 transition-colors hover:text-red-600"
              >
                ×
              </button>
            </span>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm">
        <span className="text-xs text-slate-500">Novo gasto fixo</span>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome (ex: Condomínio)"
          className="rounded-xl bg-slate-100 px-4 py-3 outline-none"
        />
        <CampoValor valorCentavos={valorCentavos} onChange={setValorCentavos} />
        <select
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          className="rounded-xl bg-slate-100 px-4 py-3 outline-none"
        >
          <option value="">Categoria…</option>
          {categorias.filter((c) => !c.arquivada).map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
        <button onClick={adicionar} className="rounded-xl bg-slate-900 py-3 text-white">
          Adicionar
        </button>
      </div>
    </>
  )
}
