'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { noitesDe, noitesNoMes, receitaNoMes } from '@/lib/calendario'
import { formatCentavos } from '@/lib/dinheiro'
import type { Categoria, Lancamento } from '@/lib/tipos'

type Props = {
  lancamentos: Lancamento[]
  categorias: Categoria[]
  competencia: string
  onEditar: (lancamento: Lancamento) => void
}

/** Quantos itens na mesma categoria e no mesmo dia justificam agrupar. */
const MINIMO_PARA_AGRUPAR = 3

/**
 * Quanto deste lançamento pertence ao mês exibido.
 *
 * Uma reserva que atravessa a virada do mês aparece nos dois meses; mostrar o
 * valor cheio nos dois faria a soma da lista não bater com o total do card.
 */
function valorNoMes(l: Lancamento, competencia: string): number {
  return l.tipo === 'entrada' ? receitaNoMes(l, competencia) : l.valorCentavos
}

type Grupo = {
  chave: string
  categoriaId: string | null
  itens: Lancamento[]
  totalCentavos: number
}

/**
 * Agrupa saídas do mesmo dia e da mesma categoria quando são muitas.
 *
 * Uma compra de mercado com doze itens não deve ocupar doze linhas do mesmo
 * peso visual que a conta de internet: a lista fica longa e o mês deixa de ser
 * legível de relance. Itens soltos continuam soltos.
 */
function agrupar(doDia: Lancamento[]): (Lancamento | Grupo)[] {
  const porCategoria = new Map<string, Lancamento[]>()
  const soltos: Lancamento[] = []

  for (const l of doDia) {
    if (l.tipo !== 'saida') {
      soltos.push(l)
      continue
    }
    const chave = l.categoriaId ?? 'sem-categoria'
    porCategoria.set(chave, [...(porCategoria.get(chave) ?? []), l])
  }

  const saida: (Lancamento | Grupo)[] = [...soltos]

  for (const [chave, itens] of porCategoria) {
    if (itens.length < MINIMO_PARA_AGRUPAR) {
      saida.push(...itens)
      continue
    }
    saida.push({
      chave: `${chave}-${itens[0].data}`,
      categoriaId: itens[0].categoriaId,
      itens,
      totalCentavos: itens.reduce((t, i) => t + i.valorCentavos, 0),
    })
  }
  return saida
}

function ehGrupo(item: Lancamento | Grupo): item is Grupo {
  return 'itens' in item
}

function rotuloDia(data: string): string {
  const [, mes, dia] = data.split('-')
  return `${dia}/${mes}`
}

export function Extrato({ lancamentos, categorias, competencia, onEditar }: Props) {
  const [abertos, setAbertos] = useState<Set<string>>(new Set())

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
  const corCategoria = (id: string | null) =>
    categorias.find((c) => c.id === id)?.cor ?? '#cbd5e1'

  const parcial = (l: Lancamento) =>
    l.tipo === 'entrada' && noitesDe(l) > 0 && noitesNoMes(l, competencia) < noitesDe(l)

  const porDia = new Map<string, Lancamento[]>()
  for (const l of lancamentos) porDia.set(l.data, [...(porDia.get(l.data) ?? []), l])
  const dias = [...porDia.entries()].sort((a, b) => b[0].localeCompare(a[0]))

  function alternar(chave: string) {
    const novo = new Set(abertos)
    if (novo.has(chave)) novo.delete(chave)
    else novo.add(chave)
    setAbertos(novo)
  }

  let indice = 0

  return (
    <div className="flex flex-col gap-5">
      {dias.map(([data, doDia]) => {
        // Programado não entra no subtotal do dia: não é dinheiro que entrou.
        const totalDoDia = doDia.reduce((t, l) => {
          if (l.tipo === 'saida') return t - l.valorCentavos
          return l.recebido ? t + valorNoMes(l, competencia) : t
        }, 0)

        return (
          <div key={data} className="flex flex-col gap-1.5">
            {/* px-4 casa com o p-4 dos cartões abaixo; o chevron invisível
                reserva exatamente a mesma largura do visível nas linhas, para
                o subtotal do dia cair na mesma coluna dos valores. Medir e
                chutar um padding erra quando a fonte ou o zoom mudam. */}
            <div className="flex items-baseline justify-between px-4">
              <span className="text-xs text-slate-400">{rotuloDia(data)}</span>
              <span className="flex items-center gap-2">
                <span className="text-[11px] tabular-nums text-slate-400">
                  {totalDoDia >= 0 ? '+' : '−'} {formatCentavos(Math.abs(totalDoDia))}
                </span>
                <span aria-hidden className="invisible">
                  ›
                </span>
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              {agrupar(doDia).map((item) => {
                const delay = Math.min(indice++ * 0.03, 0.4)

                if (ehGrupo(item)) {
                  const aberto = abertos.has(item.chave)
                  return (
                    <motion.div
                      key={item.chave}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay }}
                      className="overflow-hidden rounded-2xl bg-white shadow-sm"
                    >
                      <button
                        onClick={() => alternar(item.chave)}
                        className="flex w-full items-center justify-between p-4 text-left"
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: corCategoria(item.categoriaId) }}
                          />
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate text-sm">
                              {nomeCategoria(item.categoriaId)}
                            </span>
                            <span className="text-xs text-slate-400">
                              {item.itens.length} itens · toque para ver
                            </span>
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="text-sm tabular-nums text-red-600">
                            − {formatCentavos(item.totalCentavos)}
                          </span>
                          <span className="text-slate-300">›</span>
                        </span>
                      </button>

                      <AnimatePresence initial={false}>
                        {aberto && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="flex flex-col border-t border-slate-100"
                          >
                            {item.itens.map((l) => (
                              <button
                                key={l.id}
                                onClick={() => onEditar(l)}
                                className="flex items-center justify-between px-4 py-2.5 text-left hover:bg-slate-50"
                              >
                                <span className="min-w-0 truncate pl-4 text-xs text-slate-600">
                                  {l.descricao || '(sem descrição)'}
                                </span>
                                <span className="flex shrink-0 items-center gap-2">
                                  <span className="text-xs tabular-nums text-slate-500">
                                    {formatCentavos(l.valorCentavos)}
                                  </span>
                                  <span className="text-slate-300">›</span>
                                </span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                }

                const l = item
                return (
                  <motion.button
                    key={l.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay }}
                    onClick={() => onEditar(l)}
                    className="flex items-center justify-between rounded-2xl bg-white p-4 text-left shadow-sm transition-transform active:scale-[0.99]"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      {l.tipo === 'saida' && (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: corCategoria(l.categoriaId) }}
                        />
                      )}
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-sm">
                          {l.descricao || '(sem descrição)'}
                        </span>
                        <span className="text-xs text-slate-400">
                          {l.tipo === 'entrada' ? l.origem : nomeCategoria(l.categoriaId)}
                          {parcial(l) && ` · ${noitesNoMes(l, competencia)} de ${noitesDe(l)} noites`}
                          {l.tipo === 'entrada' && !l.recebido && (
                            <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
                              programado
                            </span>
                          )}
                        </span>
                      </span>
                    </span>
                    {/* Valor e chevron precisam ser UM filho só. Com três
                        filhos, o justify-between distribui o espaço entre eles
                        e o valor para no meio da linha em vez de encostar na
                        direita — cada linha alinhava num lugar diferente. */}
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="flex flex-col items-end">
                        <span
                          className={`text-sm tabular-nums ${
                            l.tipo === 'saida'
                              ? 'text-red-600'
                              : l.recebido
                                ? 'text-emerald-600'
                                : 'text-slate-400'
                          }`}
                        >
                          {l.tipo === 'entrada' ? '+' : '−'}{' '}
                          {formatCentavos(valorNoMes(l, competencia))}
                        </span>
                        {parcial(l) && (
                          <span className="text-[11px] tabular-nums text-slate-400">
                            de {formatCentavos(l.valorCentavos)}
                          </span>
                        )}
                      </span>
                      <span className="text-slate-300">›</span>
                    </span>
                  </motion.button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
