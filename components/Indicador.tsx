import type { ReactNode } from 'react'

type Props = {
  rotulo: string
  valor: ReactNode
  /** Linha pequena abaixo do valor: contexto, comparação, unidade. */
  detalhe?: ReactNode
  /**
   * Cor do valor. Dinheiro segue verde para entrada, vermelho para saída e
   * neutro para saldo; `marca` é para números que não são dinheiro. O rosa
   * da marca é próximo demais do vermelho no escuro: um saldo positivo em
   * rosa se lê como negativo.
   */
  tom?: 'neutro' | 'marca' | 'positivo' | 'negativo'
}

const CORES: Record<NonNullable<Props['tom']>, string> = {
  neutro: 'text-slate-900',
  marca: 'text-marca',
  positivo: 'text-emerald-600',
  negativo: 'text-red-600',
}

/**
 * Cartão de um número só. É a peça que as telas de Resumo, Agenda e Análise
 * compartilham, para os indicadores terem o mesmo peso e o mesmo ritmo em
 * qualquer lugar do app.
 */
export function Indicador({ rotulo, valor, detalhe, tom = 'neutro' }: Props) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-3xl bg-white p-4 shadow-sm sm:p-5">
      <span className="truncate text-xs text-slate-500">{rotulo}</span>
      <span className={`truncate text-xl font-semibold tracking-tight tabular-nums ${CORES[tom]}`}>
        {valor}
      </span>
      {detalhe && <span className="truncate text-[11px] text-slate-400">{detalhe}</span>}
    </div>
  )
}
