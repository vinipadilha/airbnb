export type Tema = 'claro' | 'escuro' | 'sistema'

export const TEMAS: Tema[] = ['claro', 'escuro', 'sistema']

/** Chave do cache local. O banco é a fonte; isto só evita o flash ao abrir. */
export const CHAVE_TEMA = 'studio-tema'

export function ehTema(valor: unknown): valor is Tema {
  return valor === 'claro' || valor === 'escuro' || valor === 'sistema'
}

/** Se a escolha resulta em tela escura agora, considerando o sistema. */
export function resolveEscuro(tema: Tema, sistemaEscuro: boolean): boolean {
  return tema === 'escuro' || (tema === 'sistema' && sistemaEscuro)
}

/**
 * Script que roda antes da primeira pintura, dentro do <head>.
 *
 * Sem ele, a página pintaria clara, o React subiria, leria a preferência e
 * trocaria para escura — um clarão branco a cada abertura no modo noturno.
 * Por isso é uma string curta e sem dependência: tem que rodar antes de
 * qualquer bundle.
 */
export const SCRIPT_TEMA_INICIAL = `(function(){try{var t=localStorage.getItem('${CHAVE_TEMA}')||'sistema';var d=t==='escuro'||(t==='sistema'&&matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})()`
