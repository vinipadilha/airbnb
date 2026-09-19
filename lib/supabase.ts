import { createClient } from '@supabase/supabase-js'

/**
 * Cliente com a service_role key. Ignora RLS por natureza.
 *
 * NUNCA importe este módulo de um componente cliente ou de qualquer arquivo com
 * 'use client'. Ele só pode ser alcançado por route handlers. Se a chave chegar
 * ao navegador, o banco inteiro fica aberto.
 */
export function clienteServidor() {
  const url = process.env.SUPABASE_URL
  const chave = process.env.SUPABASE_SERVICE_KEY

  if (!url || !chave) {
    throw new Error(
      'SUPABASE_URL e SUPABASE_SERVICE_KEY precisam estar definidas no ambiente.',
    )
  }

  return createClient(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
