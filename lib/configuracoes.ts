import { clienteServidor } from './supabase'
import type { Configuracoes } from './tipos'

const PADRAO: Configuracoes = { percentualGestao: 12, nomeSocio: 'Sócio' }

/**
 * Lê a configuração única do negócio.
 *
 * Devolve o padrão quando a tabela ainda não existe (migração 003 não rodada),
 * para o app continuar de pé em vez de derrubar a tela inteira por causa de
 * uma configuração.
 */
export async function carregarConfiguracoes(): Promise<Configuracoes> {
  const { data, error } = await clienteServidor()
    .from('configuracoes')
    .select('percentual_gestao, nome_socio')
    .eq('id', 1)
    .maybeSingle()

  if (error || !data) return PADRAO

  return {
    percentualGestao: data.percentual_gestao as number,
    nomeSocio: data.nome_socio as string,
  }
}
