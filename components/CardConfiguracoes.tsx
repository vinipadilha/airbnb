'use client'

import { useState } from 'react'
import type { Configuracoes } from '@/lib/tipos'

type Props = {
  configuracoes: Configuracoes
  onSalvo: (c: Configuracoes) => void
}

export function CardConfiguracoes({ configuracoes, onSalvo }: Props) {
  const [percentual, setPercentual] = useState(String(configuracoes.percentualGestao))
  const [nomeSocio, setNomeSocio] = useState(configuracoes.nomeSocio)
  const [erro, setErro] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const numero = Number(percentual)
  const invalido =
    percentual.trim() === '' || !Number.isInteger(numero) || numero < 0 || numero > 100

  const mudou =
    !invalido &&
    (numero !== configuracoes.percentualGestao || nomeSocio.trim() !== configuracoes.nomeSocio)

  async function salvar() {
    setSalvando(true)
    setErro(null)
    setSalvo(false)

    const resposta = await fetch('/api/configuracoes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ percentualGestao: numero, nomeSocio: nomeSocio.trim() }),
    })
    setSalvando(false)

    if (!resposta.ok) {
      const c = (await resposta.json()) as { erro?: string }
      setErro(c.erro ?? 'Não foi possível salvar.')
      return
    }

    onSalvo((await resposta.json()) as Configuracoes)
    setSalvo(true)
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm">
      <span className="text-xs text-slate-500">Divisão do resultado</span>

      <p className="text-xs text-slate-400">
        Do que sobra depois dos gastos do mês, esta porcentagem fica com você e o
        resto é do sócio. Gastos lançados na categoria de repasse não entram
        nessa conta — eles abatem o que você já pagou.
      </p>

      <div className="flex items-end gap-3">
        <label className="flex w-28 flex-col gap-1">
          <span className="text-xs text-slate-500">Sua parte</span>
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 px-4 py-3">
            <input
              inputMode="numeric"
              value={percentual}
              onChange={(e) => {
                setPercentual(e.target.value)
                setSalvo(false)
              }}
              className="w-full bg-transparent text-right tabular-nums outline-none"
            />
            <span className="text-slate-400">%</span>
          </div>
        </label>

        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs text-slate-500">Nome do sócio</span>
          <input
            value={nomeSocio}
            onChange={(e) => {
              setNomeSocio(e.target.value)
              setSalvo(false)
            }}
            className="rounded-xl bg-slate-100 px-4 py-3 outline-none"
          />
        </label>
      </div>

      {!invalido && (
        <p className="text-xs text-slate-400">
          Você {numero}% · {nomeSocio.trim() || 'sócio'} {100 - numero}%
        </p>
      )}
      {invalido && (
        <p className="text-xs text-red-600">Informe um número inteiro entre 0 e 100.</p>
      )}
      {erro && <p className="text-xs text-red-600">{erro}</p>}

      <button
        onClick={salvar}
        disabled={!mudou || salvando}
        className="rounded-xl bg-slate-900 py-3 text-sm text-white disabled:opacity-40"
      >
        {salvando ? 'Salvando…' : salvo && !mudou ? 'Salvo' : 'Salvar'}
      </button>
    </div>
  )
}
