'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function Entrar() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    setEnviando(true)
    setErro(null)

    const resposta = await fetch('/api/sessao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    })

    if (resposta.ok) {
      router.replace('/')
      router.refresh()
      return
    }

    const corpo = (await resposta.json()) as { erro?: string }
    setErro(corpo.erro ?? 'Não foi possível entrar.')
    setPin('')
    setEnviando(false)
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <form onSubmit={enviar} className="flex w-full max-w-xs flex-col gap-6">
        <h1 className="text-center text-lg font-medium">Studio</h1>
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="PIN"
          className="rounded-xl bg-slate-100 px-4 py-3 text-center text-2xl tracking-[0.3em] tabular-nums outline-none focus:ring-2 focus:ring-slate-400"
        />
        {erro && <p className="text-center text-sm text-red-600">{erro}</p>}
        <button
          type="submit"
          disabled={enviando || pin.length === 0}
          className="rounded-xl bg-slate-900 py-3 text-white disabled:opacity-40"
        >
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
