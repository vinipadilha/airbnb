'use client'

import { motion } from 'framer-motion'
import { noitesDe, noitesNoMes, receitaNoMes } from '@/lib/calendario'
import { formatCentavos } from '@/lib/dinheiro'
import type { Categoria, Lancamento } from '@/lib/tipos'

type Props = {
  lancamentos: Lancamento[]
  categorias: Categoria[]
  competencia: string
  onEditar: (lancamento: Lancamento) => void
}

/**
 * Quanto deste lançamento pertence ao mês exibido.
 *
 * Uma reserva que atravessa a virada do mês aparece nos dois meses, e mostrar
 * o valor cheio nos dois faria a soma da lista não bater com o total do card —
 * o usuário somaria R$ 3.683 numa tela que anuncia R$ 3.241.
 */
function valorNoMes(l: Lancamento, competencia: string): number {
  return l.tipo === 'entrada' ? receitaNoMes(l, competencia) : l.valorCentavos
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

export function Extrato({ lancamentos, categorias, competencia, onEditar }: Props) {
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

  /** Reserva que só em parte pertence a este mês. */
  const parcial = (l: Lancamento) =>
    l.tipo === 'entrada' && noitesDe(l) > 0 && noitesNoMes(l, competencia) < noitesDe(l)

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
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm">{l.descricao || '(sem descrição)'}</span>
                  <span className="text-xs text-slate-400">
                    {l.tipo === 'entrada' ? l.origem : nomeCategoria(l.categoriaId)}
                    {parcial(l) &&
                      ` · ${noitesNoMes(l, competencia)} de ${noitesDe(l)} noites`}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end">
                  <span
                    className={`text-sm tabular-nums ${
                      l.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {l.tipo === 'entrada' ? '+' : '−'} {formatCentavos(valorNoMes(l, competencia))}
                  </span>
                  {parcial(l) && (
                    <span className="text-[11px] tabular-nums text-slate-400">
                      de {formatCentavos(l.valorCentavos)}
                    </span>
                  )}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
