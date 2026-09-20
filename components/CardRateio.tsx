'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { hojeEmSaoPaulo } from '@/lib/competencia'
import { formatCentavos, parseValorBRL } from '@/lib/dinheiro'
import type { Rateio } from '@/lib/rateio'
import type { Configuracoes, Repasse } from '@/lib/tipos'
import { ValorAnimado } from './ValorAnimado'

type Props = {
  rateio: Rateio
  configuracoes: Configuracoes
  repasses: Repasse[]
  competencia: string
  onMudou: () => void
}

function rotuloCurto(data: string): string {
  const [, mes, dia] = data.split('-')
  return `${dia}/${mes}`
}

export function CardRateio({ rateio, configuracoes, repasses, competencia, onMudou }: Props) {
  const { percentualGestao: percentualSeu, nomeSocio } = configuracoes
  const { liquidoCentavos, suaParteCentavos, parteDoSocioCentavos } = rateio
  const { repassadoCentavos, aRepassarCentavos } = rateio

  const [aberto, setAberto] = useState(false)
  const [texto, setTexto] = useState('')
  const [data, setData] = useState(hojeEmSaoPaulo())
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const doMes = repasses.filter((r) => r.data.slice(0, 7) === competencia)

  if (liquidoCentavos === 0 && doMes.length === 0) return null

  const fatiaSua = liquidoCentavos > 0 ? (suaParteCentavos / liquidoCentavos) * 100 : 0

  async function registrar() {
    const centavos = parseValorBRL(texto)
    if (centavos === null) {
      setErro('Informe um valor maior que zero.')
      return
    }

    setSalvando(true)
    setErro(null)

    const resposta = await fetch('/api/repasses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, valorCentavos: centavos }),
    })
    setSalvando(false)

    if (!resposta.ok) {
      const c = (await resposta.json()) as { erro?: string }
      setErro(c.erro ?? 'Não foi possível registrar.')
      return
    }

    setTexto('')
    setAberto(false)
    onMudou()
  }

  async function remover(id: string) {
    if (!confirm('Remover este repasse?')) return
    await fetch(`/api/repasses/${id}`, { method: 'DELETE' })
    onMudou()
  }

  /** Preenche o campo com o que ainda falta, que é o caso comum. */
  function preencherComOQueFalta() {
    setAberto(true)
    if (aRepassarCentavos > 0) {
      setTexto(formatCentavos(aRepassarCentavos).replace('R$', '').trim())
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-slate-500">Divisão do resultado</span>
        <span className="text-xs text-slate-400">
          líquido {formatCentavos(liquidoCentavos)}
        </span>
      </div>

      {liquidoCentavos > 0 && (
        <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="bg-slate-900" style={{ width: `${fatiaSua}%` }} />
          <div className="flex-1 bg-slate-300" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="h-2 w-2 rounded-full bg-slate-900" />
            Sua parte ({percentualSeu}%)
          </span>
          <ValorAnimado centavos={suaParteCentavos} className="text-lg" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            {nomeSocio} ({100 - percentualSeu}%)
          </span>
          <ValorAnimado centavos={parteDoSocioCentavos} className="text-lg" />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between">
          <span className="flex flex-col">
            <span className="text-xs text-slate-500">
              {aRepassarCentavos > 0
                ? 'Falta repassar'
                : aRepassarCentavos < 0
                  ? 'Você adiantou'
                  : 'Tudo repassado'}
            </span>
            <span className="text-[11px] text-slate-400">
              já enviou {formatCentavos(repassadoCentavos)}
            </span>
          </span>
          <span
            className={`text-xl tabular-nums ${
              aRepassarCentavos > 0
                ? 'text-amber-600'
                : aRepassarCentavos < 0
                  ? 'text-sky-600'
                  : 'text-emerald-600'
            }`}
          >
            {formatCentavos(Math.abs(aRepassarCentavos))}
          </span>
        </div>

        {doMes.length > 0 && (
          <div className="flex flex-col gap-1">
            {doMes.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
              >
                <span className="text-xs text-slate-500">
                  Pix em {rotuloCurto(r.data)}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-xs tabular-nums text-slate-600">
                    {formatCentavos(r.valorCentavos)}
                  </span>
                  <button
                    onClick={() => void remover(r.id)}
                    aria-label="Remover repasse"
                    className="text-slate-300 transition-colors hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}

        <AnimatePresence initial={false} mode="wait">
          {aberto ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-2"
            >
              <div className="flex gap-2">
                <div className="flex flex-1 items-center gap-1 rounded-xl bg-slate-100 px-3 py-2.5">
                  <span className="text-xs text-slate-400">R$</span>
                  <input
                    autoFocus
                    inputMode="decimal"
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-transparent text-right text-sm tabular-nums outline-none"
                  />
                </div>
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="rounded-xl bg-slate-100 px-3 py-2.5 text-sm outline-none"
                />
              </div>

              {erro && <p className="text-xs text-red-600">{erro}</p>}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setAberto(false)
                    setErro(null)
                  }}
                  className="rounded-xl px-4 py-2.5 text-sm text-slate-500"
                >
                  Cancelar
                </button>
                <button
                  onClick={registrar}
                  disabled={salvando}
                  className="flex-1 rounded-xl bg-slate-900 py-2.5 text-sm text-white disabled:opacity-40"
                >
                  {salvando ? 'Registrando…' : 'Registrar Pix'}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="botao"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={preencherComOQueFalta}
              className="rounded-xl border border-slate-200 py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-50"
            >
              Registrar Pix para {nomeSocio}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
