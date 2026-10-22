import { clienteServidor } from './supabase'
import { ehTema } from './tema'
import type { Configuracoes } from './tipos'

const PADRAO: Configuracoes = { percentualGestao: 12, nomeSocio: 'Sócio', tema: 'sistema', limiteSocioCentavos: null }

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
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  if (error || !data) return PADRAO

  return {
    percentualGestao: data.percentual_gestao as number,
    nomeSocio: data.nome_socio as string,
    // Sem a migração 008 a coluna não existe: segue o sistema.
    tema: ehTema(data.tema) ? data.tema : 'sistema',
    // Sem a migração 009 a coluna não existe: só porcentagem, como antes.
    limiteSocioCentavos:
      typeof data.limite_socio_centavos === 'number' ? data.limite_socio_centavos : null,
  }
}
