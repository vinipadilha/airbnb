import type { GastoFixo, GastoFixoLancado } from './tipos'

/**
 * Gastos fixos que ainda não foram lançados na competência dada.
 * Competência é texto YYYY-MM, então comparação lexicográfica equivale a
 * comparação cronológica — é por isso que o formato importa.
 */
export function gastosPendentes(
  gastosFixos: GastoFixo[],
  lancados: GastoFixoLancado[],
  competencia: string,
): GastoFixo[] {
  const jaLancados = new Set(
    lancados
      .filter((l) => l.competencia === competencia)
      .map((l) => l.gastoFixoId),
  )

  return gastosFixos.filter(
    (g) =>
      !g.arquivada &&
      g.competenciaInicial <= competencia &&
      !jaLancados.has(g.id),
  )
}
