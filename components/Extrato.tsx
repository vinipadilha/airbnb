'use client'

import { motion } from 'framer-motion'
import { formatCentavos } from '@/lib/dinheiro'
import type { Categoria, Lancamento } from '@/lib/tipos'

type Props = {
  lancamentos: Lancamento[]
  categorias: Categoria[]
  onEditar: (lancamento: Lancamento) => void
}

function agruparPorDia(lancamentos: Lancamento[]): [string, Lancamento[]][] {
  const grupos = new Map<string, Lancamento[]>()
  for (const l of lancamentos) {
    const lista = grupos.get(l.data) ?? []
    lista.push(l)
    grupos.set(l.data, lista)
  }
  // Mais recente primeiro.
  return [...grupos.entries()].sort((a, b) => b[0].localeCompare(a[0]))
}

function rotuloDia(data: string): string {
  const [, mes, dia] = data.split('-')
  return `${dia}/${mes}`
}

export function Extrato({ lancamentos, categorias, onEditar }: Props) {
  if (lancamentos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-10 text-center shadow-sm">
        <p className="text-sm text-slate-500">Nenhum lançamento neste mês.</p>
        <p className="text-xs text-slate-400">Toque no + para registrar o primeiro.</p>
      </div>
    )
  }

  const nomeCategoria = (id: string | null) =>
    categorias.find((c) => c.id === id)?.nome ?? 'Sem categoria'

  let indice = 0

  return (
    <div className="flex flex-col gap-6">
      {agruparPorDia(lancamentos).map(([data, doDia]) => (
        <div key={data} className="flex flex-col gap-2">
          <span className="px-1 text-xs text-slate-400">{rotuloDia(data)}</span>
          <div className="flex flex-col gap-2">
            {doDia.map((l) => (
              <motion.button
                key={l.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(indice++ * 0.03, 0.4) }}
                onClick={() => onEditar(l)}
                className="flex items-center justify-between rounded-2xl bg-white p-4 text-left shadow-sm"
              >
                <span className="flex flex-col">
                  <span className="text-sm">{l.descricao || '(sem descrição)'}</span>
                  <span className="text-xs text-slate-400">
                    {l.tipo === 'entrada' ? l.origem : nomeCategoria(l.categoriaId)}
                  </span>
                </span>
                <span
                  className={`text-sm tabular-nums ${
                    l.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {l.tipo === 'entrada' ? '+' : '−'} {formatCentavos(l.valorCentavos)}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
