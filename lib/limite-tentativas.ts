import { clienteServidor } from './supabase'

const MAX_TENTATIVAS = 5
const JANELA_MS = 15 * 60 * 1000

/** Identificador da janela de 15 minutos em que o instante cai. */
export function janelaDe(agora: number = Date.now()): string {
  return new Date(Math.floor(agora / JANELA_MS) * JANELA_MS).toISOString()
}

export async function bloqueado(ip: string): Promise<boolean> {
  const { data, error } = await clienteServidor()
    .from('tentativas_pin')
    .select('tentativas')
    .eq('ip', ip)
    .eq('janela', janelaDe())
    .maybeSingle()

  // Falha fechada: se não dá para saber quantas tentativas houve, bloqueia.
  // Falhar aberto faria o limite sumir silenciosamente justamente quando o
  // banco está instável — e sem banco o app não serve para nada mesmo.
  if (error) return true

  return (data?.tentativas ?? 0) >= MAX_TENTATIVAS
}

export async function registrarFalha(ip: string): Promise<void> {
  // Incremento atômico no banco (função registrar_falha_pin, criada na Task 8).
  // Ler e depois gravar daqui abriria uma corrida: duas requisições simultâneas
  // leriam o mesmo valor e gravariam o mesmo +1, deixando o limite inócuo.
  await clienteServidor().rpc('registrar_falha_pin', {
    p_ip: ip,
    p_janela: janelaDe(),
  })
}
