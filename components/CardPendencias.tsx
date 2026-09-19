'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { hojeEmSaoPaulo, rotuloCompetencia } from '@/lib/competencia'
import { formatCentavos, parseValorBRL } from '@/lib/dinheiro'
import type { GastoFixo } from '@/lib/tipos'

type Props = {
  pendentes: GastoFixo[]
  competencia: string
  /** Recebe as falhas para exibir FORA do card, que remonta ao lançar. */
  onLancado: (falhas: string[]) => void
}

export function CardPendencias({ pendentes, competencia, onLancado }: Props) {
  const [aberto, setAberto] = useState(false)
  const [marcados, setMarcados] = useState<Set<string>>(new Set(pendentes.map((p) => p.id)))
  const [valores, setValores] = useState<Record<string, string>>(
    Object.fromEntries(
      pendentes.map((p) => [p.id, formatCentavos(p.valorReferenciaCentavos).replace('R$', '').trim()]),
    ),
  )
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (pendentes.length === 0) return null

  function alternar(id: string) {
    const novo = new Set(marcados)
    if (novo.has(id)) novo.delete(id)
    else novo.add(id)
    setMarcados(novo)
  }

  async function confirmar() {
    const itens = []
    for (const p of pendentes) {
      if (!marcados.has(p.id)) continue
      const centavos = parseValorBRL(valores[p.id] ?? '')
      if (centavos === null) {
        setErro(`Valor inválido em ${p.nome}.`)
        return
      }
      itens.push({ gastoFixoId: p.id, valorCentavos: centavos, data: hojeEmSaoPaulo() })
    }

    if (itens.length === 0) {
      setAberto(false)
      return
    }

    setEnviando(true)
    setErro(null)

    const resposta = await fetch('/api/pendencias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itens }),
    })

    setEnviando(false)

    const corpo = (await resposta.json()) as { ok?: boolean; falhas?: string[] }

    // As falhas sobem para o pai: este card é remontado assim que a lista de
    // pendentes muda (ver a key na Task 23, Step 2), e um setErro local seria
    // apagado justamente no caso de sucesso parcial, que é quando ele importa.
    onLancado(corpo.falhas?.length ? corpo.falhas : resposta.ok ? [] : ['Não foi possível lançar.'])
    if (corpo.ok) setAberto(false)
  }

  return (
    <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-sm">
      <button onClick={() => setAberto(!aberto)} className="flex w-full items-center justify-between text-left">
        <span className="text-sm">
          {pendentes.length === 1
            ? `1 gasto fixo de ${rotuloCompetencia(competencia)} ainda não lançado`
            : `${pendentes.length} gastos fixos de ${rotuloCompetencia(competencia)} ainda não lançados`}
        </span>
        <span className="text-slate-400">{aberto ? '−' : '+'}</span>
      </button>

      <AnimatePresence initial={false}>
        {aberto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="mt-4 flex flex-col gap-3"
          >
            {pendentes.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={marcados.has(p.id)}
                  onChange={() => alternar(p.id)}
                  className="h-4 w-4"
                />
                <span className="flex-1 text-sm">{p.nome}</span>
                <input
                  inputMode="decimal"
                  value={valores[p.id] ?? ''}
                  onChange={(e) => setValores({ ...valores, [p.id]: e.target.value })}
                  className="w-28 rounded-lg bg-white/10 px-3 py-2 text-right text-sm tabular-nums outline-none"
                />
              </div>
            ))}

            {erro && <p className="text-xs text-amber-300">{erro}</p>}

            <button
              onClick={confirmar}
              disabled={enviando}
              className="mt-1 rounded-xl bg-white py-3 text-sm text-slate-900 disabled:opacity-40"
            >
              {enviando ? 'Lançando…' : 'Lançar selecionados'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
