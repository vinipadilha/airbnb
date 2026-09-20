import { NextResponse } from 'next/server'
import { diariaMediaDoMes, diasDoMes, noitesNoMes, ocupacaoDoMes } from '@/lib/calendario'
import { competenciaAtual, competenciaDe } from '@/lib/competencia'
import { paraLancamento, type LinhaLancamento } from '@/lib/mapeamento'
import { carregarConfiguracoes } from '@/lib/configuracoes'
import { calcularRateio } from '@/lib/rateio'
import { clienteServidor } from '@/lib/supabase'
import { saidasPorCategoria, saldoAcumulado, totaisDoMes } from '@/lib/totais'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const competencia = searchParams.get('competencia') ?? competenciaAtual()

  if (!/^\d{4}-\d{2}$/.test(competencia)) {
    return NextResponse.json({ erro: 'Competência inválida.' }, { status: 400 })
  }

  const supabase = clienteServidor()

  const [lancamentosRes, categoriasRes, repassesRes] = await Promise.all([
    supabase.from('lancamentos').select('*').order('data', { ascending: false }).order('criado_em', { ascending: false }),
    supabase.from('categorias').select('*').order('nome'),
    supabase
      .from('repasses')
      .select('id, data, valor_centavos, observacao')
      .order('data', { ascending: false }),
  ])

  if (lancamentosRes.error || categoriasRes.error) {
    return NextResponse.json(
      { erro: lancamentosRes.error?.message ?? categoriasRes.error?.message },
      { status: 500 },
    )
  }

  const todos = (lancamentosRes.data as LinhaLancamento[]).map(paraLancamento)

  const categorias = (categoriasRes.data as Record<string, unknown>[]).map((c) => ({
    id: c.id as string,
    nome: c.nome as string,
    cor: c.cor as string,
    arquivada: c.arquivada as boolean,
    // Instalação que ainda não rodou a migração 002 não tem a coluna; tratar
    // como true mantém o app funcionando, só sem separar o repasse.
    entraNoRateio: c.entra_no_rateio !== false,
  }))

  const config = await carregarConfiguracoes()

  // Sem a migração 004 a tabela de repasses não existe: tratar como vazia
  // mantém o dashboard de pé em vez de derrubar a tela inteira.
  const repasses = (repassesRes.error ? [] : repassesRes.data).map(
    (r: Record<string, unknown>) => ({
      id: r.id as string,
      data: r.data as string,
      valorCentavos: r.valor_centavos as number,
      observacao: r.observacao as string,
    }),
  )

  // Uma reserva pertence ao mês se alguma das suas noites cai nele — não só
  // se o check-in caiu. É o que faz a estadia longa aparecer nos meses do meio.
  const doMes = todos.filter(
    (l) => competenciaDe(l.data) === competencia || noitesNoMes(l, competencia) > 0,
  )

  return NextResponse.json({
    competencia,
    lancamentos: doMes,
    dias: diasDoMes(todos, competencia),
    ocupacao: ocupacaoDoMes(todos, competencia),
    diariaMediaCentavos: diariaMediaDoMes(todos, competencia),
    totais: totaisDoMes(todos, competencia),
    saldoTotalCentavos: saldoAcumulado(todos),
    porCategoria: saidasPorCategoria(todos, competencia),
    categorias,
    repasses,
    rateio: calcularRateio(
      todos,
      categorias,
      repasses,
      competencia,
      config.percentualGestao,
    ),
    configuracoes: config,
  })
}
