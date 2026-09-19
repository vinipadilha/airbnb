import type { EntradaLancamento } from '@/lib/mapeamento'

/** Valida o corpo recebido. Devolve o lançamento ou a mensagem de erro. */
export function validarCorpo(corpo: unknown):
  | { ok: true; valor: EntradaLancamento }
  | { ok: false; erro: string } {
  const c = corpo as Record<string, unknown>

  if (c?.tipo !== 'entrada' && c?.tipo !== 'saida') {
    return { ok: false, erro: 'Tipo inválido.' }
  }
  if (typeof c.data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(c.data)) {
    return { ok: false, erro: 'Data inválida.' }
  }
  if (!Number.isInteger(c.valorCentavos) || (c.valorCentavos as number) <= 0) {
    return { ok: false, erro: 'Valor precisa ser maior que zero.' }
  }
  if (c.tipo === 'saida' && typeof c.categoriaId !== 'string') {
    return { ok: false, erro: 'Saída precisa de categoria.' }
  }
  if (c.tipo === 'entrada' && (typeof c.origem !== 'string' || c.origem.trim() === '')) {
    return { ok: false, erro: 'Entrada precisa de origem.' }
  }

  for (const campo of ['noites', 'hospedes'] as const) {
    const v = c[campo]
    // Barra aqui em vez de deixar o CHECK do banco barrar: senão o usuário vê
    // a mensagem crua do Postgres.
    if (v !== undefined && v !== null && (!Number.isInteger(v) || (v as number) <= 0)) {
      return { ok: false, erro: `Campo ${campo} precisa ser um número maior que zero.` }
    }
  }

  return {
    ok: true,
    valor: {
      tipo: c.tipo,
      data: c.data,
      valorCentavos: c.valorCentavos as number,
      descricao: typeof c.descricao === 'string' ? c.descricao : '',
      categoriaId: typeof c.categoriaId === 'string' ? c.categoriaId : null,
      origem: typeof c.origem === 'string' ? c.origem : null,
      noites: Number.isInteger(c.noites) ? (c.noites as number) : null,
      hospedes: Number.isInteger(c.hospedes) ? (c.hospedes as number) : null,
    },
  }
}
