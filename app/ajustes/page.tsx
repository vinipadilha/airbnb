'use client'

import { useCallback, useEffect, useState } from 'react'
import { ImportarCsv } from '@/components/ImportarCsv'
import { Navegacao } from '@/components/Navegacao'
import type { Categoria } from '@/lib/tipos'

export default function Ajustes() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setErro(null)
    try {
      const resposta = await fetch('/api/mes')
      if (!resposta.ok) throw new Error('falhou')
      setCategorias(((await resposta.json()) as { categorias: Categoria[] }).categorias)
    } catch {
      setErro('Não foi possível carregar.')
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function adicionar() {
    if (nome.trim() === '') return
    await fetch('/api/categorias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome }),
    })
    setNome('')
    void carregar()
  }

  async function arquivar(id: string, nomeDaCategoria: string) {
    if (!confirm(`Remover "${nomeDaCategoria}"? Os lançamentos antigos continuam classificados.`)) {
      return
    }
    await fetch(`/api/categorias/${id}`, { method: 'DELETE' })
    void carregar()
  }

  return (
    <>
      <Navegacao />
      <h1 className="text-lg font-medium">Ajustes</h1>

      {erro && <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{erro}</p>}

      <div className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm">
        <span className="text-xs text-slate-500">Categorias</span>
        {categorias.filter((c) => !c.arquivada).map((c) => (
          <div key={c.id} className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.cor }} />
            <span className="flex-1 text-sm">{c.nome}</span>
            <button
              onClick={() => void arquivar(c.id, c.nome)}
              aria-label={`Remover ${c.nome}`}
              className="text-slate-300 transition-colors hover:text-red-600"
            >
              ×
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nova categoria"
            className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm outline-none"
          />
          <button onClick={adicionar} className="rounded-xl bg-slate-900 px-5 text-white">
            +
          </button>
        </div>
      </div>

      <ImportarCsv onImportado={() => void carregar()} />
    </>
  )
}
