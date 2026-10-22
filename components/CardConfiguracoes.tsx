'use client'

import { useState } from 'react'
import { formatCentavos } from '@/lib/dinheiro'
import { dividirLiquido, type RegraDivisao } from '@/lib/rateio'
import type { Configuracoes } from '@/lib/tipos'
import { CampoValor } from './CampoValor'

type Props = {
  configuracoes: Configuracoes
  onSalvo: (c: Configuracoes) => void
}

type Modo = 'percentual' | 'limite'

/**
 * Líquidos de exemplo para a prévia: um abaixo e outro acima de um teto
 * típico, para mostrar os dois lados da regra antes de salvar.
 */
const EXEMPLOS = [200000, 500000]

export function CardConfiguracoes({ configuracoes, onSalvo }: Props) {
  const [nomeSocio, setNomeSocio] = useState(configuracoes.nomeSocio)
  const [modo, setModo] = useState<Modo>(
    configuracoes.limiteSocioCentavos === null ? 'percentual' : 'limite',
  )
  const [percentual, setPercentual] = useState(String(configuracoes.percentualGestao))
  const [limite, setLimite] = useState<number | null>(configuracoes.limiteSocioCentavos)
  const [erro, setErro] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const numero = Number(percentual)
  const percentualInvalido =
    percentual.trim() === '' || !Number.isInteger(numero) || numero < 0 || numero > 100
  const limiteInvalido = modo === 'limite' && limite === null
  const invalido = percentualInvalido || limiteInvalido

  const limiteFinal = modo === 'limite' ? limite : null
  const mudou =
    !invalido &&
    (numero !== configuracoes.percentualGestao ||
      nomeSocio.trim() !== configuracoes.nomeSocio ||
      limiteFinal !== configuracoes.limiteSocioCentavos)

  const regra: RegraDivisao = { percentualSeu: numero, limiteSocioCentavos: limiteFinal }
  const socio = nomeSocio.trim() || 'Sócio'

  function marcarAlterado() {
    setSalvo(false)
  }

  async function salvar() {
    setSalvando(true)
    setErro(null)
    setSalvo(false)

    const resposta = await fetch('/api/configuracoes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        percentualGestao: numero,
        nomeSocio: nomeSocio.trim(),
        limiteSocioCentavos: limiteFinal,
      }),
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
    <div className="flex flex-col gap-5 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Divisão do resultado</span>
        <p className="text-xs text-slate-400">
          Do que sobra depois dos gastos do mês. O que {socio} paga do bolso volta para
          ele no repasse, por fora desta divisão.
        </p>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-slate-500">Nome do sócio</span>
        <input
          value={nomeSocio}
          onChange={(e) => {
            setNomeSocio(e.target.value)
            marcarAlterado()
          }}
          className="rounded-xl bg-slate-100 px-4 py-3 outline-none focus:ring-2 focus:ring-marca/40"
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-xs text-slate-500">Como dividir</span>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {[
            { valor: 'percentual' as const, rotulo: 'Por porcentagem' },
            { valor: 'limite' as const, rotulo: 'Com teto' },
          ].map((op) => (
            <button
              key={op.valor}
              type="button"
              onClick={() => {
                setModo(op.valor)
                marcarAlterado()
              }}
              className={`flex-1 rounded-lg py-2 text-sm transition-colors ${
                modo === op.valor
                  ? 'bg-white font-medium text-slate-900 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              {op.rotulo}
            </button>
          ))}
        </div>
      </div>

      {modo === 'limite' && (
        <div className="flex flex-col gap-1.5">
          <CampoValor
            rotulo={`${socio} fica com até, por mês`}
            valorCentavos={limite}
            onChange={(c) => {
              setLimite(c)
              marcarAlterado()
            }}
          />
          <span className="text-xs text-slate-400">O que passar desse valor é todo seu.</span>
        </div>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-slate-500">
          {modo === 'limite' ? 'Até o teto, sua parte é' : 'Sua parte'}
        </span>
        <div className="flex w-32 items-center gap-1 rounded-xl bg-slate-100 px-4 py-3">
          <input
            inputMode="numeric"
            value={percentual}
            onChange={(e) => {
              setPercentual(e.target.value)
              marcarAlterado()
            }}
            className="w-full bg-transparent text-right tabular-nums outline-none"
          />
          <span className="text-slate-400">%</span>
        </div>
        {modo === 'limite' && (
          <span className="text-xs text-slate-400">
            Com 0%, tudo até o teto é de {socio}. Com outro valor, a parte abaixo do teto
            é dividida nessa proporção.
          </span>
        )}
      </label>

      {/* Prévia com números de verdade: é aqui que se confere se a regra faz o
          que foi combinado, antes de salvar e afetar o repasse do mês. */}
      {!invalido && (
        <div className="flex flex-col gap-2 rounded-2xl bg-slate-50 p-4">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Prévia
          </span>
          {EXEMPLOS.map((liquido) => {
            const seu = dividirLiquido(liquido, regra)
            return (
              <div key={liquido} className="flex flex-col gap-1">
                <span className="text-xs text-slate-500">
                  Líquido de {formatCentavos(liquido)}
                </span>
                <div className="flex justify-between text-sm tabular-nums">
                  <span>
                    <span className="text-marca">Você </span>
                    <span className="font-medium">{formatCentavos(seu)}</span>
                  </span>
                  <span>
                    <span className="text-slate-400">{socio} </span>
                    <span className="font-medium">{formatCentavos(liquido - seu)}</span>
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {percentualInvalido && (
        <p className="text-xs text-red-600">A porcentagem precisa ser um inteiro de 0 a 100.</p>
      )}
      {limiteInvalido && <p className="text-xs text-red-600">Informe o teto em reais.</p>}
      {erro && <p className="text-xs text-red-600">{erro}</p>}

      <button
        onClick={salvar}
        disabled={!mudou || salvando}
        className="bg-marca-gradiente rounded-xl py-3 text-sm font-medium text-branco transition-transform active:scale-[0.98] disabled:opacity-40"
      >
        {salvando ? 'Salvando…' : salvo && !mudou ? 'Salvo' : 'Salvar'}
      </button>
    </div>
  )
}
