'use client'

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from 'react'
import { CHAVE_TEMA, ehTema, resolveEscuro, type Tema } from '@/lib/tema'

type ValorTema = {
  tema: Tema
  /** Se a tela está escura agora — útil para o ícone do botão. */
  escuro: boolean
  mudarTema: (tema: Tema) => void
}

const ContextoTema = createContext<ValorTema | null>(null)

/** Evento próprio: o 'storage' nativo só dispara em OUTRAS abas, não nesta. */
const EVENTO_TEMA = 'studio-tema-mudou'

function lerTema(): Tema {
  try {
    const salvo = localStorage.getItem(CHAVE_TEMA)
    return ehTema(salvo) ? salvo : 'sistema'
  } catch {
    // Aba anônima ou armazenamento bloqueado: segue o sistema.
    return 'sistema'
  }
}

function lerEscuro(): boolean {
  return document.documentElement.classList.contains('dark')
}

/**
 * Tema e classe `dark` são estado de fora do React — localStorage e o <html>,
 * que o script do <head> já ajustou antes de o React subir. Por isso são
 * lidos com useSyncExternalStore em vez de copiados para um useState num
 * efeito: a cópia daria uma renderização extra a cada abertura e um quadro
 * com o ícone errado antes de corrigir.
 */
function assinar(avisar: () => void): () => void {
  const observador = new MutationObserver(avisar)
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  window.addEventListener(EVENTO_TEMA, avisar)
  window.addEventListener('storage', avisar)
  return () => {
    observador.disconnect()
    window.removeEventListener(EVENTO_TEMA, avisar)
    window.removeEventListener('storage', avisar)
  }
}

function sistemaEscuro(): boolean {
  return matchMedia('(prefers-color-scheme: dark)').matches
}

/** Grava a escolha e aplica na tela. Não toca no banco. */
function aplicarLocal(tema: Tema) {
  try {
    localStorage.setItem(CHAVE_TEMA, tema)
  } catch {
    // Sem armazenamento local, o banco ainda guarda a escolha.
  }
  document.documentElement.classList.toggle('dark', resolveEscuro(tema, sistemaEscuro()))
  window.dispatchEvent(new Event(EVENTO_TEMA))
}

export function ProvedorTema({ children }: { children: React.ReactNode }) {
  // No servidor não há tela: assume claro e "sistema". O cliente lê o valor
  // real na hidratação, já correto graças ao script do <head>.
  const tema = useSyncExternalStore(assinar, lerTema, () => 'sistema' as Tema)
  const escuro = useSyncExternalStore(assinar, lerEscuro, () => false)

  // O banco é a fonte: se outro aparelho trocou o tema, este acompanha. Só
  // escreve fora do React — a leitura acima percebe sozinha.
  useEffect(() => {
    void (async () => {
      try {
        const resposta = await fetch('/api/configuracoes')
        if (!resposta.ok) return
        const { tema: doBanco } = (await resposta.json()) as { tema?: unknown }
        if (ehTema(doBanco) && doBanco !== lerTema()) aplicarLocal(doBanco)
      } catch {
        // Sem rede, o cache local continua valendo.
      }
    })()
  }, [])

  // No modo "sistema", trocar o tema do aparelho troca o app junto.
  useEffect(() => {
    if (tema !== 'sistema') return
    const consulta = matchMedia('(prefers-color-scheme: dark)')
    const ouvir = () => aplicarLocal('sistema')
    consulta.addEventListener('change', ouvir)
    return () => consulta.removeEventListener('change', ouvir)
  }, [tema])

  const mudarTema = useCallback((novo: Tema) => {
    aplicarLocal(novo)
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
