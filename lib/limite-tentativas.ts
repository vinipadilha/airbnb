import { clienteServidor } from './supabase'

const MAX_POR_IP = 5
/**
 * Teto global por janela, somando todos os IPs. Existe porque o IP do
 * requisitante não é confiável: qualquer um pode mandar um X-Forwarded-For
 * diferente a cada tentativa e ganhar um balde novo, o que deixaria o limite
 * por IP inócuo. Um usuário legítimo erra o PIN três ou quatro vezes, nunca 20.
 */
const MAX_GLOBAL = 20
const CHAVE_GLOBAL = '*global*'
const JANELA_MS = 15 * 60 * 1000

/** Identificador da janela de 15 minutos em que o instante cai. */
export function janelaDe(agora: number = Date.now()): string {
  return new Date(Math.floor(agora / JANELA_MS) * JANELA_MS).toISOString()
}

/**
 * IP do requisitante, na melhor aproximação disponível.
 *
 * `x-real-ip` é preenchido pela Vercel a partir da conexão e o cliente não
 * consegue forjá-lo. O primeiro valor de `x-forwarded-for`, ao contrário, é
 * inteiramente controlado por quem chama — serve só como último recurso em
 * desenvolvimento. É por isso que o teto global acima existe.
 */
export function ipDoPedido(request: Request): string {
  return (
    request.headers.get('x-real-ip')?.trim() ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'desconhecido'
  )
}

export async function bloqueado(ip: string): Promise<boolean> {
  const { data, error } = await clienteServidor()
    .from('tentativas_pin')
    .select('ip, tentativas')
    .in('ip', [ip, CHAVE_GLOBAL])
    .eq('janela', janelaDe())

  // Falha fechada: se não dá para saber quantas tentativas houve, bloqueia.
  // Falhar aberto faria o limite sumir silenciosamente justamente quando o
  // banco está instável — e sem banco o app não serve para nada mesmo.
  if (error) return true

  const linha = (chave: string) =>
    (data.find((l) => l.ip === chave)?.tentativas as number | undefined) ?? 0

  return linha(ip) >= MAX_POR_IP || linha(CHAVE_GLOBAL) >= MAX_GLOBAL
}

export async function registrarFalha(ip: string): Promise<void> {
  // Incremento atômico no banco (função registrar_falha_pin, criada na Task 8).
  // Ler e depois gravar daqui abriria uma corrida: duas requisições simultâneas
  // leriam o mesmo valor e gravariam o mesmo +1, deixando o limite inócuo.
  const supabase = clienteServidor()
  const janela = janelaDe()

  await Promise.all([
    supabase.rpc('registrar_falha_pin', { p_ip: ip, p_janela: janela }),
    supabase.rpc('registrar_falha_pin', { p_ip: CHAVE_GLOBAL, p_janela: janela }),
  ])
}
