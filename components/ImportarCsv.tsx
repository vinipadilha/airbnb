'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { formatCentavos } from '@/lib/dinheiro'
import {
  marcarDuplicados,
  parseCsvEntradas,
  type LancamentoExistente,
  type LinhaImportMarcada,
} from '@/lib/csv'

/**
 * Decodifica tentando UTF-8 e caindo para windows-1252 (o "Latin-1" que o Excel
 * brasileiro de fato produz) quando aparece caractere de substituição.
 */
async function lerTexto(arquivo: File): Promise<string> {
  const bytes = await arquivo.arrayBuffer()
  const utf8 = new TextDecoder('utf-8').decode(bytes)
  if (!utf8.includes('�')) return utf8
  return new TextDecoder('windows-1252').decode(bytes)
}

export function ImportarCsv({ onImportado }: { onImportado: () => void }) {
  const [linhas, setLinhas] = useState<LinhaImportMarcada[]>([])
  const [escolhidas, setEscolhidas] = useState<Set<number>>(new Set())
  const [erro, setErro] = useState<string | null>(null)
  const [resultado, setResultado] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [texto, setTexto] = useState('')
  const existentes = useRef<LancamentoExistente[]>([])

  // Busca as entradas já gravadas UMA vez, não a cada tecla digitada.
  useEffect(() => {
    void (async () => {
      const resposta = await fetch('/api/entradas')
      if (resposta.ok) existentes.current = (await resposta.json()) as LancamentoExistente[]
    })()
  }, [])

  const preparar = useCallback((conteudo: string) => {
    setErro(null)
    setResultado(null)

    if (conteudo.trim() === '') {
      setLinhas([])
      setEscolhidas(new Set())
      return
    }

    try {
      const marcadas = marcarDuplicados(parseCsvEntradas(conteudo), existentes.current)
      setLinhas(marcadas)
      // Duplicadas e linhas com erro vêm desmarcadas (spec §7).
      setEscolhidas(
        new Set(marcadas.filter((l) => l.erro === null && !l.duplicada).map((l) => l.linha)),
      )
    } catch (e) {
      setLinhas([])
      setEscolhidas(new Set())
      setErro((e as Error).message)
    }
  }, [])

  // Analisa 400ms depois da última tecla. Sem isso, o preview reclamaria de
  // "cabeçalho inválido" já na primeira letra digitada, e cada tecla jogaria
  // fora os checkboxes que o usuário tivesse marcado.
  useEffect(() => {
    const id = setTimeout(() => preparar(texto), 400)
    return () => clearTimeout(id)
  }, [texto, preparar])

  async function importar() {
    const paraGravar = linhas
      .filter((l) => escolhidas.has(l.linha) && l.erro === null)
      .map((l) => ({
        data: l.data as string,
        valorCentavos: l.valorCentavos as number,
        descricao: l.descricao,
        noites: l.noites,
        hospedes: l.hospedes,
      }))

    if (paraGravar.length === 0) {
      setErro('Nenhuma linha selecionada.')
      return
    }

    setEnviando(true)
    const resposta = await fetch('/api/importar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linhas: paraGravar }),
    })
    setEnviando(false)

    if (!resposta.ok) {
      const c = (await resposta.json()) as { erro?: string }
      setErro(c.erro ?? 'Não foi possível importar.')
      return
    }

    const { importadas } = (await resposta.json()) as { importadas: number }
    setResultado(`${importadas} ${importadas === 1 ? 'entrada importada' : 'entradas importadas'}.`)
    setTexto('')
    setLinhas([])
    setEscolhidas(new Set())

    // Recarrega a base de comparação: o que acabou de entrar passa a contar
    // como duplicata num import seguinte.
    const atualizadas = await fetch('/api/entradas')
    if (atualizadas.ok) existentes.current = (await atualizadas.json()) as LancamentoExistente[]

    onImportado()
  }

  const validas = linhas.filter((l) => l.erro === null).length
  const comErro = linhas.length - validas
  const duplicadas = linhas.filter((l) => l.duplicada).length

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm">
      <span className="text-xs text-slate-500">Importar reservas (CSV)</span>
      <p className="text-xs text-slate-400">
        Colunas: data, valor, descricao (opcionalmente noites e hospedes). Aceita
        separador <code>;</code> ou <code>,</code>, datas 31/12/2025 ou 2025-12-31,
        valores 1.234,56 ou 1234.56. Todas as linhas viram entradas com origem Airbnb.
      </p>

      <input
        type="file"
        accept=".csv,text/csv,text/plain"
        onChange={async (e) => {
          const arquivo = e.target.files?.[0]
          if (arquivo) setTexto(await lerTexto(arquivo))
          // Reseta o input: sem isso, escolher o mesmo arquivo de novo depois
          // de importar não dispara onChange nenhum.
          e.target.value = ''
        }}
        className="text-sm"
      />

      <textarea
        placeholder="…ou cole o conteúdo aqui"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={4}
        className="rounded-xl bg-slate-100 p-3 font-mono text-xs outline-none"
      />

      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {resultado && <p className="text-sm text-emerald-700">{resultado}</p>}

      {linhas.length > 0 && (
        <>
          <p className="text-xs text-slate-500">
            {validas} {validas === 1 ? 'linha válida' : 'linhas válidas'}
            {comErro > 0 && `, ${comErro} com erro`}
            {duplicadas > 0 && `, ${duplicadas} provável duplicada`}
          </p>

          <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-100">
            {linhas.map((l) => (
              <label
                key={l.linha}
                className={`flex items-center gap-3 border-b border-slate-50 p-3 text-xs last:border-0 ${
                  l.erro ? 'bg-red-50' : l.duplicada ? 'bg-amber-50' : ''
                }`}
              >
                <input
                  type="checkbox"
                  disabled={l.erro !== null}
                  checked={escolhidas.has(l.linha)}
                  onChange={() => {
                    const novo = new Set(escolhidas)
                    if (novo.has(l.linha)) novo.delete(l.linha)
                    else novo.add(l.linha)
                    setEscolhidas(novo)
                  }}
                />
                <span className="w-8 text-slate-300">{l.linha}</span>
                <span className="w-24 tabular-nums">{l.data ?? '—'}</span>
                <span className="w-24 text-right tabular-nums">
                  {l.valorCentavos === null ? '—' : formatCentavos(l.valorCentavos)}
                </span>
                <span className="flex-1 truncate text-slate-500">
                  {l.erro ?? (l.duplicada ? `${l.descricao} (já existe?)` : l.descricao)}
                </span>
              </label>
            ))}
          </div>

          <button
            onClick={importar}
            disabled={enviando}
            className="rounded-xl bg-slate-900 py-3 text-white disabled:opacity-40"
          >
            {enviando ? 'Importando…' : `Importar ${escolhidas.size} selecionadas`}
          </button>
        </>
      )}
    </div>
  )
}
