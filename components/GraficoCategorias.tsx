'use client'

import { useReducedMotion } from 'framer-motion'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { formatCentavos } from '@/lib/dinheiro'
import type { Categoria } from '@/lib/tipos'
import type { TotalCategoria } from '@/lib/totais'

type Props = {
  porCategoria: TotalCategoria[]
  categorias: Categoria[]
}

export function GraficoCategorias({ porCategoria, categorias }: Props) {
  const reduzirMovimento = useReducedMotion()

  if (porCategoria.length === 0) return null

  const dados = porCategoria.map((item) => {
    const categoria = categorias.find((c) => c.id === item.categoriaId)
    return {
      // Chave própria: duas categorias podem ter o mesmo nome.
      chave: item.categoriaId ?? 'sem-categoria',
      nome: categoria?.nome ?? 'Sem categoria',
      cor: categoria?.cor ?? '#cbd5e1',
      valor: item.totalCentavos,
    }
  })

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm">
      <span className="text-xs text-slate-500">Saídas por categoria</span>

      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={dados}
              dataKey="valor"
              nameKey="nome"
              innerRadius="62%"
              outerRadius="100%"
              paddingAngle={2}
              stroke="none"
              // Cresce do zero na primeira renderização (spec §8).
              isAnimationActive={!reduzirMovimento}
              animationDuration={350}
            >
              {dados.map((d) => (
                <Cell key={d.chave} fill={d.cor} />
              ))}
            </Pie>
            <Tooltip
              // No Recharts 3 o Tooltip deixou de ser genérico: anotar o
              // parâmetro como number não compila em strict. O Number() aqui é
              // necessário, não defensivo.
              formatter={(valor) => formatCentavos(Number(valor))}
              contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-col gap-2">
        {dados.map((d) => (
          <div key={d.chave} className="flex items-center gap-3 text-xs">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.cor }} />
            <span className="flex-1 text-slate-600">{d.nome}</span>
            <span className="tabular-nums text-slate-500">{formatCentavos(d.valor)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
