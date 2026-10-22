'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { CHAVE_TEMA, ehTema, resolveEscuro, type Tema } from '@/lib/tema'

type ValorTema = {
  tema: Tema
  /** Se a tela está escura agora — útil para o ícone do botão. */
  escuro: boolean
  mudarTema: (tema: Tema) => void
}

const ContextoTema = createContext<ValorTema | null>(null)

function sistemaEscuro(): boolean {
  return typeof window !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches
}

function lerCache(): Tema {
  try {
    const salvo = localStorage.getItem(CHAVE_TEMA)
    return ehTema(salvo) ? salvo : 'sistema'
  } catch {
    // Aba anônima ou armazenamento bloqueado: segue o sistema.
    return 'sistema'
  }
}

function aplicar(tema: Tema) {
  document.documentElement.classList.toggle('dark', resolveEscuro(tema, sistemaEscuro()))
}

export function ProvedorTema({ children }: { children: React.ReactNode }) {
  // Começa em 'sistema' no servidor e lê o cache no cliente: o script do
  // <head> já aplicou a classe certa antes da pintura, então isto só
  // sincroniza o estado do React com o que já está na tela.
  const [tema, setTema] = useState<Tema>('sistema')
  const [escuro, setEscuro] = useState(false)

  useEffect(() => {
    const local = lerCache()
    setTema(local)
    setEscuro(resolveEscuro(local, sistemaEscuro()))

    // O banco é a fonte: se outro aparelho trocou o tema, este acompanha.
    void (async () => {
      try {
        const resposta = await fetch('/api/configuracoes')
        if (!resposta.ok) return
        const { tema: doBanco } = (await resposta.json()) as { tema?: unknown }
        if (ehTema(doBanco) && doBanco !== local) {
          localStorage.setItem(CHAVE_TEMA, doBanco)
          setTema(doBanco)
          aplicar(doBanco)
          setEscuro(resolveEscuro(doBanco, sistemaEscuro()))
        }
      } catch {
        // Sem rede, o cache local continua valendo.
      }
    })()
  }, [])

  // No modo "sistema", trocar o tema do aparelho troca o app junto, sem
  // precisar recarregar.
  useEffect(() => {
    if (tema !== 'sistema') return
    const consulta = matchMedia('(prefers-color-scheme: dark)')
    const ouvir = () => {
      aplicar('sistema')
      setEscuro(consulta.matches)
    }
    consulta.addEventListener('change', ouvir)
    return () => consulta.removeEventListener('change', ouvir)
  }, [tema])

  const mudarTema = useCallback((novo: Tema) => {
    setTema(novo)
    aplicar(novo)
    setEscuro(resolveEscuro(novo, sistemaEscuro()))
    try {
      localStorage.setItem(CHAVE_TEMA, novo)
    } catch {
      // Sem armazenamento local, o banco ainda guarda a escolha.
    }
    void fetch('/api/configuracoes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tema: novo }),
    })
  }, [])

  return (
    <ContextoTema.Provider value={{ tema, escuro, mudarTema }}>{children}</ContextoTema.Provider>
  )
}

export function useTema(): ValorTema {
  const valor = useContext(ContextoTema)
  if (!valor) throw new Error('useTema precisa estar dentro de ProvedorTema.')
  return valor
}
