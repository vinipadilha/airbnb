# App Financeiro do Studio — Plano de Implementação

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir um app web pessoal que registra entradas (reservas do Airbnb) e saídas (gastos fixos e avulsos) de um studio de temporada, com saldo, visão mensal e breakdown por categoria.

**Architecture:** Next.js App Router com toda a lógica de dinheiro isolada em módulos puros de `lib/` (sem React, sem rede, testáveis com `node:test`). O navegador nunca fala com o Supabase: ele chama route handlers do próprio app, que usam a *service role key* no servidor. Uma tranca por PIN com cookie assinado protege todas as rotas.

**Tech Stack:** Next.js (App Router), React 19, TypeScript strict, Tailwind CSS v4, Supabase (Postgres), Framer Motion, Recharts 3, `node:test` + `tsx`.

> **Sobre versões:** o plano usa `@latest` e foi escrito contra Next 16 /
> Recharts 3 / Tailwind v4 — o que o `create-next-app` instala hoje. Onde uma
> API mudou entre versões (o formatter do Recharts, a fonte do scaffold, a
> config do Tailwind) o plano avisa no ponto. Anote no Step 2 da Task 1 as
> versões que caírem no seu `package.json`: se divergirem muito das citadas,
> confira esses pontos antes de seguir.

**Spec:** `docs/superpowers/specs/2026-09-18-financeiro-studio-design.md` — leia antes de começar. Em qualquer divergência, a spec vence este plano.

---

## Convenções que valem para o plano inteiro

**Dinheiro é sempre `number` inteiro de centavos.** Nenhuma função, coluna,
prop ou payload de API carrega reais em ponto flutuante. A conversão para texto
acontece só na borda de exibição (`formatCentavos`) e a partir de texto só na
borda de entrada (`parseValorBRL`). Se você se pegar multiplicando por 100 fora
desses dois pontos, parou no lugar errado.

**Datas são strings `YYYY-MM-DD`.** Nunca objetos `Date` em modelo, banco ou
API. `Date` aparece só onde é inevitável (saber que dia é hoje), e aí a conversão
para string passa obrigatoriamente por `hojeEmSaoPaulo()`. A razão está na spec:
o servidor roda em UTC e o usuário não.

**Competência é a string `YYYY-MM`.** É a chave de agrupamento do app inteiro.

**Nada de `any`.** O `tsconfig` está em strict; se o tipo estiver difícil, o
desenho está errado.

**Testes rodam com `npm test`** (`node --import tsx --test "lib/**/*.test.ts"`).
Só `lib/` tem teste. Componentes React não têm — decisão da spec §11.

**Commits:** um por task concluída, em português, no modo imperativo, prefixado
com `feat:`, `test:`, `fix:` ou `chore:`.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `lib/tipos.ts` | Tipos do domínio: `Lancamento`, `Categoria`, `GastoFixo`, `GastoFixoLancado`. Sem lógica. |
| `lib/dinheiro.ts` | `parseValorBRL`, `formatCentavos`. A única fronteira entre texto e centavos. |
| `lib/competencia.ts` | `competenciaDe`, `hojeEmSaoPaulo`, `competenciaAtual`, `deslocarCompetencia`, `rotuloCompetencia`. |
| `lib/totais.ts` | `totaisDoMes`, `saldoAcumulado`, `saidasPorCategoria`. |
| `lib/pendencias.ts` | `gastosPendentes`. |
| `lib/csv.ts` | `parseCsvEntradas`, `marcarDuplicados`. |
| `lib/sessao.ts` | `assinarToken`, `verificarToken`. A única peça de segurança; mora em `lib/` para ser testável. |
| `lib/supabase.ts` | Cliente Supabase com service key. **Só importado por route handlers.** |
| `proxy.ts` | Bloqueia toda rota sem cookie de sessão válido (era `middleware.ts` até o Next 15). |
| `app/api/**/route.ts` | Route handlers: lançamentos, categorias, gastos fixos, pendências, import, sessão. |
| `app/page.tsx` | Dashboard. |
| `app/fixos/page.tsx` | Gastos fixos. |
| `app/ajustes/page.tsx` | Categorias e import de CSV. |
| `app/entrar/page.tsx` | Tela do PIN. |
| `components/**` | UI. Sem regra de negócio — tudo que calcula vem de `lib/`. |
| `supabase/schema.sql` | DDL completo, idempotente, para colar no SQL Editor do Supabase. |

---

## Chunk 1: Fundação e lógica de dinheiro

Nada aqui toca rede ou banco. No fim do chunk existe um projeto que compila e
uma suíte de testes verde cobrindo toda a matemática do app.

### Task 1: Esqueleto do projeto

**Files:**
- Create (pelo `create-next-app`): `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.gitignore`
- Create (à mão): `.env.local.example`

> O Next 15 traz **Tailwind v4**, que se configura por `@import "tailwindcss"`
> dentro de `globals.css` e **não gera `tailwind.config.ts`**. Confira o que o
> scaffold produziu em vez de criar um arquivo de config que a versão instalada
> ignora.

- [ ] **Step 1: Criar o projeto**

```bash
cd ~/Desktop/studio-financeiro
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --eslint --use-npm
```

Responda "No" se perguntar sobre Turbopack. O diretório já tem `docs/` e `.git` —
o create-next-app aceita diretório não vazio.

- [ ] **Step 2: Instalar as dependências do projeto**

```bash
npm install @supabase/supabase-js framer-motion recharts
npm install -D tsx
```

Anote as versões que caíram:

```bash
node -p "Object.entries(require('./package.json').dependencies).map(([k,v])=>k+' '+v).join('\n')"
```

- [ ] **Step 3: Adicionar os scripts de teste e typecheck**

Em `package.json`, dentro de `"scripts"`:

```json
"typecheck": "tsc --noEmit",
"test": "node --import tsx --test \"lib/**/*.test.ts\""
```

- [ ] **Step 4: Documentar as variáveis de ambiente**

Crie `.env.local.example`:

```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
APP_PIN=
APP_SESSION_SECRET=
```

Confirme que `.gitignore` já ignora `.env*.local`. O create-next-app põe isso por
padrão — se não estiver lá, adicione. Vazar a service key no git é o pior erro
possível neste projeto.

- [ ] **Step 5: Verificar que compila**

Run: `npm run typecheck && npm run build`
Expected: ambos passam.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: cria esqueleto Next.js com Tailwind e runner de testes"
```

---

### Task 2: Tipos do domínio

**Files:**
- Create: `lib/tipos.ts`

Sem teste: é só declaração de tipo, o `typecheck` já é a verificação.

- [ ] **Step 1: Escrever os tipos**

```ts
export type TipoLancamento = 'entrada' | 'saida'

export type Categoria = {
  id: string
  nome: string
  cor: string
  arquivada: boolean
}

export type Lancamento = {
  id: string
  tipo: TipoLancamento
  /** YYYY-MM-DD */
  data: string
  valorCentavos: number
  descricao: string
  /** Só em saídas. */
  categoriaId: string | null
  /** Só em entradas. */
  origem: string | null
  noites: number | null
  hospedes: number | null
  criadoEm: string
}

export type GastoFixo = {
  id: string
  nome: string
  valorReferenciaCentavos: number
  categoriaId: string
  arquivada: boolean
  /** YYYY-MM a partir do qual o gasto passa a gerar pendência. */
  competenciaInicial: string
}

export type GastoFixoLancado = {
  gastoFixoId: string
  /** YYYY-MM */
  competencia: string
  lancamentoId: string
}
```

- [ ] **Step 2: Verificar**

Run: `npm run typecheck`
Expected: passa.

- [ ] **Step 3: Commit**

```bash
git add lib/tipos.ts
git commit -m "feat: define tipos do domínio"
```

---

### Task 3: Conversão de dinheiro

**Files:**
- Create: `lib/dinheiro.ts`
- Test: `lib/dinheiro.test.ts`

`parseValorBRL` precisa aguentar o que o usuário cola do Excel brasileiro e o que
ele digita no formulário. É a função com mais casos-limite do projeto.

- [ ] **Step 1: Escrever os testes que falham**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { formatCentavos, parseValorBRL } from './dinheiro'

test('parseValorBRL aceita formato pt-BR com milhar e decimal', () => {
  assert.equal(parseValorBRL('1.234,56'), 123456)
  assert.equal(parseValorBRL('98,00'), 9800)
  assert.equal(parseValorBRL('0,05'), 5)
})

test('parseValorBRL aceita formato com ponto decimal', () => {
  assert.equal(parseValorBRL('1234.56'), 123456)
  assert.equal(parseValorBRL('98.5'), 9850)
})

test('parseValorBRL aceita inteiro sem decimal', () => {
  assert.equal(parseValorBRL('98'), 9800)
  assert.equal(parseValorBRL('1.234'), 123400)
})

test('parseValorBRL ignora prefixo e espaços', () => {
  assert.equal(parseValorBRL(' R$ 1.234,56 '), 123456)
  assert.equal(parseValorBRL('R$98,00'), 9800)
})

test('parseValorBRL arredonda centavos extras', () => {
  assert.equal(parseValorBRL('10,555'), 1056)
})

test('parseValorBRL rejeita o que não é número', () => {
  assert.equal(parseValorBRL(''), null)
  assert.equal(parseValorBRL('   '), null)
  assert.equal(parseValorBRL('abc'), null)
  assert.equal(parseValorBRL('R$'), null)
  assert.equal(parseValorBRL('12,34,56'), null)
})

test('parseValorBRL rejeita zero e negativo', () => {
  assert.equal(parseValorBRL('0'), null)
  assert.equal(parseValorBRL('0,00'), null)
  assert.equal(parseValorBRL('-50,00'), null)
})

test('formatCentavos devolve moeda pt-BR', () => {
  //   é espaço inquebrável: é o que o Intl pt-BR/BRL emite entre "R$" e os
  // dígitos. Escrever um espaço comum aqui faz o teste falhar de um jeito que
  // não aparece no diff, porque os dois caracteres são visualmente idênticos.
  assert.equal(formatCentavos(123456), 'R$ 1.234,56')
  assert.equal(formatCentavos(9800), 'R$ 98,00')
  assert.equal(formatCentavos(0), 'R$ 0,00')
})

test('formatCentavos preserva o sinal', () => {
  assert.equal(formatCentavos(-9800), '-R$ 98,00')
})
```

> **Sobre os testes de `formatCentavos`:** quem decide o formato é o `Intl`, não
> você. Duas armadilhas conhecidas: o separador é **espaço inquebrável**
> (` `), não espaço comum, e o sinal vem antes do símbolo
> (`-R$ 98,00`). Se a sua versão do Node divergir disso, **corrija o teste
> para o que o Node faz** — forçar a implementação a contrariar o `Intl` produz
> valor formatado errado na tela.

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm test`
Expected: FAIL — `Cannot find module './dinheiro'`.

- [ ] **Step 3: Implementar**

```ts
const FORMATADOR = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

/**
 * Converte texto digitado ou colado em centavos.
 * Aceita "1.234,56" (pt-BR) e "1234.56". Devolve null se não for um valor
 * monetário positivo válido.
 */
export function parseValorBRL(entrada: string): number | null {
  const limpo = entrada.replace(/R\$/gi, '').replace(/\s/g, '').trim()
  if (limpo === '') return null
  if (!/^-?[\d.,]+$/.test(limpo)) return null

  const temVirgula = limpo.includes(',')
  const temPonto = limpo.includes('.')

  let normalizado: string
  if (temVirgula) {
    // Vírgula é o decimal; ponto é separador de milhar.
    if (limpo.split(',').length > 2) return null
    normalizado = limpo.replace(/\./g, '').replace(',', '.')
  } else if (temPonto) {
    const partes = limpo.split('.')
    // "1.234" é milhar; "1234.56" é decimal. O desempate é o tamanho do último
    // grupo: exatamente 3 dígitos significa milhar.
    const ultimo = partes[partes.length - 1]
    normalizado =
      partes.length > 1 && ultimo.length === 3
        ? partes.join('')
        : partes.length > 2
          ? partes.slice(0, -1).join('') + '.' + ultimo
          : limpo
  } else {
    normalizado = limpo
  }

  const numero = Number(normalizado)
  if (!Number.isFinite(numero)) return null

  const centavos = Math.round(numero * 100)
  if (centavos <= 0) return null
  return centavos
}

/** Formata centavos como moeda pt-BR. */
export function formatCentavos(centavos: number): string {
  return FORMATADOR.format(centavos / 100)
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm test`
Expected: PASS em todos os casos de `dinheiro.test.ts`.

Se `'1.234'` falhar, revise o desempate de milhar — é o ponto sutil da função.

- [ ] **Step 5: Commit**

```bash
git add lib/dinheiro.ts lib/dinheiro.test.ts
git commit -m "feat: converte e formata valores em centavos"
```

---

### Task 4: Competência e calendário

**Files:**
- Create: `lib/competencia.ts`
- Test: `lib/competencia.test.ts`

Este módulo é a defesa contra o bug de fuso descrito na spec §4.

- [ ] **Step 1: Escrever os testes que falham**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  competenciaAtual,
  competenciaDe,
  deslocarCompetencia,
  hojeEmSaoPaulo,
  rotuloCompetencia,
} from './competencia'

test('competenciaDe extrai YYYY-MM da data', () => {
  assert.equal(competenciaDe('2026-09-18'), '2026-09')
  assert.equal(competenciaDe('2025-01-01'), '2025-01')
  assert.equal(competenciaDe('2026-12-31'), '2026-12')
})

test('hojeEmSaoPaulo usa o fuso local, não UTC', () => {
  // 01/10 às 01:00 UTC ainda é 30/09 em São Paulo (UTC-3).
  const instante = new Date('2026-10-01T01:00:00Z')
  assert.equal(hojeEmSaoPaulo(instante), '2026-09-30')
})

test('hojeEmSaoPaulo no meio do dia', () => {
  assert.equal(hojeEmSaoPaulo(new Date('2026-09-18T15:00:00Z')), '2026-09-18')
})

test('competenciaAtual usa o fuso local', () => {
  assert.equal(competenciaAtual(new Date('2026-10-01T01:00:00Z')), '2026-09')
})

test('deslocarCompetencia anda para frente e para trás', () => {
  assert.equal(deslocarCompetencia('2026-09', 1), '2026-10')
  assert.equal(deslocarCompetencia('2026-09', -1), '2026-08')
})

test('deslocarCompetencia atravessa a virada de ano', () => {
  assert.equal(deslocarCompetencia('2026-12', 1), '2027-01')
  assert.equal(deslocarCompetencia('2026-01', -1), '2025-12')
  assert.equal(deslocarCompetencia('2026-01', -13), '2024-12')
})

test('rotuloCompetencia devolve mês por extenso em português', () => {
  assert.equal(rotuloCompetencia('2026-09'), 'setembro 2026')
  assert.equal(rotuloCompetencia('2025-01'), 'janeiro 2025')
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm test`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar**

```ts
const TZ = 'America/Sao_Paulo'

// 'sv-SE' formata como YYYY-MM-DD, que é exatamente o formato que queremos.
const FORMATADOR_DATA = new Intl.DateTimeFormat('sv-SE', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

/** '2026-09-18' -> '2026-09' */
export function competenciaDe(data: string): string {
  return data.slice(0, 7)
}

/**
 * Data de hoje (YYYY-MM-DD) no fuso do usuário.
 * O servidor roda em UTC; usar a data UTC jogaria lançamentos noturnos para o
 * mês errado.
 */
export function hojeEmSaoPaulo(agora: Date = new Date()): string {
  return FORMATADOR_DATA.format(agora)
}

/** Competência corrente no fuso do usuário. */
export function competenciaAtual(agora: Date = new Date()): string {
  return competenciaDe(hojeEmSaoPaulo(agora))
}

/** Soma (ou subtrai) meses a uma competência. */
export function deslocarCompetencia(competencia: string, delta: number): string {
  const [ano, mes] = competencia.split('-').map(Number)
  const total = ano * 12 + (mes - 1) + delta
  const novoAno = Math.floor(total / 12)
  const novoMes = total % 12
  return `${novoAno}-${String(novoMes + 1).padStart(2, '0')}`
}

/** '2026-09' -> 'setembro 2026' */
export function rotuloCompetencia(competencia: string): string {
  const [ano, mes] = competencia.split('-').map(Number)
  return `${MESES[mes - 1]} ${ano}`
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/competencia.ts lib/competencia.test.ts
git commit -m "feat: calcula competência mensal no fuso do usuário"
```

---

### Task 5: Totais e breakdown

**Files:**
- Create: `lib/totais.ts`
- Test: `lib/totais.test.ts`

Funções puras: recebem a lista de lançamentos e devolvem números. Nenhuma delas
consulta banco — é o que as torna testáveis.

- [ ] **Step 1: Escrever os testes que falham**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { saidasPorCategoria, saldoAcumulado, totaisDoMes } from './totais'
import type { Lancamento } from './tipos'

function lanc(p: Partial<Lancamento> & Pick<Lancamento, 'id' | 'tipo' | 'data' | 'valorCentavos'>): Lancamento {
  return {
    descricao: 'x',
    categoriaId: null,
    origem: null,
    noites: null,
    hospedes: null,
    criadoEm: '2026-09-01T00:00:00Z',
    ...p,
  }
}

const base: Lancamento[] = [
  lanc({ id: '1', tipo: 'entrada', data: '2026-09-03', valorCentavos: 50000, origem: 'Airbnb' }),
  lanc({ id: '2', tipo: 'entrada', data: '2026-09-20', valorCentavos: 30000, origem: 'Airbnb' }),
  lanc({ id: '3', tipo: 'saida', data: '2026-09-05', valorCentavos: 9800, categoriaId: 'fixas' }),
  lanc({ id: '4', tipo: 'saida', data: '2026-09-15', valorCentavos: 12000, categoriaId: 'limpeza' }),
  lanc({ id: '5', tipo: 'entrada', data: '2026-08-10', valorCentavos: 40000, origem: 'Airbnb' }),
  lanc({ id: '6', tipo: 'saida', data: '2026-08-11', valorCentavos: 5000, categoriaId: 'limpeza' }),
]

test('totaisDoMes soma só o mês pedido', () => {
  assert.deepEqual(totaisDoMes(base, '2026-09'), {
    entradas: 80000,
    saidas: 21800,
    saldo: 58200,
  })
})

test('totaisDoMes devolve zeros em mês sem lançamento', () => {
  assert.deepEqual(totaisDoMes(base, '2026-07'), {
    entradas: 0,
    saidas: 0,
    saldo: 0,
  })
})

test('totaisDoMes aceita saldo negativo', () => {
  const caros = [
    lanc({ id: 'a', tipo: 'entrada', data: '2026-09-01', valorCentavos: 1000 }),
    lanc({ id: 'b', tipo: 'saida', data: '2026-09-02', valorCentavos: 3000 }),
  ]
  assert.equal(totaisDoMes(caros, '2026-09').saldo, -2000)
})

test('saldoAcumulado considera o histórico inteiro', () => {
  assert.equal(saldoAcumulado(base), 50000 + 30000 + 40000 - 9800 - 12000 - 5000)
})

test('saldoAcumulado de lista vazia é zero', () => {
  assert.equal(saldoAcumulado([]), 0)
})

test('saidasPorCategoria agrupa e ordena do maior para o menor', () => {
  assert.deepEqual(saidasPorCategoria(base, '2026-09'), [
    { categoriaId: 'limpeza', totalCentavos: 12000 },
    { categoriaId: 'fixas', totalCentavos: 9800 },
  ])
})

test('saidasPorCategoria ignora entradas', () => {
  const so = [lanc({ id: 'x', tipo: 'entrada', data: '2026-09-01', valorCentavos: 9999 })]
  assert.deepEqual(saidasPorCategoria(so, '2026-09'), [])
})

test('saidasPorCategoria agrupa saídas sem categoria sob null', () => {
  const orfa = [lanc({ id: 'y', tipo: 'saida', data: '2026-09-01', valorCentavos: 700 })]
  assert.deepEqual(saidasPorCategoria(orfa, '2026-09'), [
    { categoriaId: null, totalCentavos: 700 },
  ])
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm test`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar**

```ts
import { competenciaDe } from './competencia'
import type { Lancamento } from './tipos'

export type TotaisMes = {
  entradas: number
  saidas: number
  saldo: number
}

export type TotalCategoria = {
  categoriaId: string | null
  totalCentavos: number
}

function doMes(lancamentos: Lancamento[], competencia: string): Lancamento[] {
  return lancamentos.filter((l) => competenciaDe(l.data) === competencia)
}

export function totaisDoMes(lancamentos: Lancamento[], competencia: string): TotaisMes {
  let entradas = 0
  let saidas = 0
  for (const l of doMes(lancamentos, competencia)) {
    if (l.tipo === 'entrada') entradas += l.valorCentavos
    else saidas += l.valorCentavos
  }
  return { entradas, saidas, saldo: entradas - saidas }
}

export function saldoAcumulado(lancamentos: Lancamento[]): number {
  return lancamentos.reduce(
    (total, l) => (l.tipo === 'entrada' ? total + l.valorCentavos : total - l.valorCentavos),
    0,
  )
}

export function saidasPorCategoria(
  lancamentos: Lancamento[],
  competencia: string,
): TotalCategoria[] {
  const porCategoria = new Map<string | null, number>()
  for (const l of doMes(lancamentos, competencia)) {
    if (l.tipo !== 'saida') continue
    const chave = l.categoriaId
    porCategoria.set(chave, (porCategoria.get(chave) ?? 0) + l.valorCentavos)
  }
  return [...porCategoria.entries()]
    .map(([categoriaId, totalCentavos]) => ({ categoriaId, totalCentavos }))
    .sort((a, b) => b.totalCentavos - a.totalCentavos)
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/totais.ts lib/totais.test.ts
git commit -m "feat: calcula totais do mês, saldo acumulado e breakdown"
```

---

### Task 6: Gastos fixos pendentes

**Files:**
- Create: `lib/pendencias.ts`
- Test: `lib/pendencias.test.ts`

Implementa a regra da spec §5. Os três cortes (arquivada, competência inicial,
já lançado) precisam de teste cada um, porque cada um sozinho gera bug diferente.

- [ ] **Step 1: Escrever os testes que falham**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { gastosPendentes } from './pendencias'
import type { GastoFixo, GastoFixoLancado } from './tipos'

function fixo(p: Partial<GastoFixo> & Pick<GastoFixo, 'id' | 'nome'>): GastoFixo {
  return {
    valorReferenciaCentavos: 9800,
    categoriaId: 'fixas',
    arquivada: false,
    competenciaInicial: '2026-01',
    ...p,
  }
}

const internet = fixo({ id: 'net', nome: 'Internet' })
const pricelabs = fixo({ id: 'pl', nome: 'PriceLabs', valorReferenciaCentavos: 11000 })

test('todos pendentes quando nada foi lançado', () => {
  const r = gastosPendentes([internet, pricelabs], [], '2026-09')
  assert.deepEqual(r.map((g) => g.id), ['net', 'pl'])
})

test('gasto já lançado no mês sai da fila', () => {
  const lancados: GastoFixoLancado[] = [
    { gastoFixoId: 'net', competencia: '2026-09', lancamentoId: 'l1' },
  ]
  const r = gastosPendentes([internet, pricelabs], lancados, '2026-09')
  assert.deepEqual(r.map((g) => g.id), ['pl'])
})

test('lançamento em outro mês não tira da fila do mês corrente', () => {
  const lancados: GastoFixoLancado[] = [
    { gastoFixoId: 'net', competencia: '2026-08', lancamentoId: 'l1' },
  ]
  const r = gastosPendentes([internet], lancados, '2026-09')
  assert.deepEqual(r.map((g) => g.id), ['net'])
})

test('gasto arquivado nunca é pendente', () => {
  const morto = fixo({ id: 'x', nome: 'Antigo', arquivada: true })
  assert.deepEqual(gastosPendentes([morto], [], '2026-09'), [])
})

test('gasto criado depois do mês não gera pendência retroativa', () => {
  const novo = fixo({ id: 'novo', nome: 'Novo', competenciaInicial: '2026-09' })
  assert.deepEqual(gastosPendentes([novo], [], '2026-08'), [])
  assert.deepEqual(gastosPendentes([novo], [], '2026-09').map((g) => g.id), ['novo'])
  assert.deepEqual(gastosPendentes([novo], [], '2026-10').map((g) => g.id), ['novo'])
})

test('preserva a ordem recebida', () => {
  const r = gastosPendentes([pricelabs, internet], [], '2026-09')
  assert.deepEqual(r.map((g) => g.id), ['pl', 'net'])
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm test`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar**

```ts
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
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/pendencias.ts lib/pendencias.test.ts
git commit -m "feat: calcula gastos fixos pendentes do mês"
```

---

### Task 7: Parser de CSV

**Files:**
- Create: `lib/csv.ts`
- Test: `lib/csv.test.ts`

Implementa a spec §7. Só entradas. O parser é tolerante de propósito: o usuário
vai colar coisa exportada do Excel brasileiro.

- [ ] **Step 1: Escrever os testes que falham**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { marcarDuplicados, parseCsvEntradas } from './csv'
import type { Lancamento } from './tipos'

test('lê CSV com vírgula e data ISO', () => {
  const r = parseCsvEntradas('data,valor,descricao\n2026-09-03,500.00,Reserva 3 noites')
  assert.equal(r.length, 1)
  assert.deepEqual(r[0], {
    linha: 2,
    data: '2026-09-03',
    valorCentavos: 50000,
    descricao: 'Reserva 3 noites',
    noites: null,
    hospedes: null,
    erro: null,
  })
})

test('lê CSV do Excel pt-BR com ponto e vírgula', () => {
  const r = parseCsvEntradas('data;valor;descricao\n03/09/2026;1.234,56;Reserva')
  assert.equal(r[0].data, '2026-09-03')
  assert.equal(r[0].valorCentavos, 123456)
  assert.equal(r[0].erro, null)
})

test('aceita cabeçalho fora de ordem, com acento e maiúscula', () => {
  const r = parseCsvEntradas('Descrição;Valor;Data\nReserva;98,00;01/01/2025')
  assert.equal(r[0].descricao, 'Reserva')
  assert.equal(r[0].valorCentavos, 9800)
  assert.equal(r[0].data, '2025-01-01')
})

test('lê noites e hospedes quando presentes', () => {
  const r = parseCsvEntradas('data,valor,descricao,noites,hospedes\n2026-09-03,500,R,3,2')
  assert.equal(r[0].noites, 3)
  assert.equal(r[0].hospedes, 2)
})

test('noites e hospedes inválidos viram null sem invalidar a linha', () => {
  const r = parseCsvEntradas('data,valor,descricao,noites,hospedes\n2026-09-03,500,R,abc,0')
  assert.equal(r[0].erro, null)
  assert.equal(r[0].noites, null)
  assert.equal(r[0].hospedes, null)
})

test('marca linha com data ilegível sem derrubar as outras', () => {
  const texto = [
    'data,valor,descricao',
    '2026-09-03,500,Boa',
    '32/13/2026,500,Ruim',
    '2026-09-05,600,Boa2',
  ].join('\n')
  const r = parseCsvEntradas(texto)
  assert.equal(r.length, 3)
  assert.equal(r[0].erro, null)
  assert.match(r[1].erro ?? '', /data/i)
  assert.equal(r[2].erro, null)
})

test('marca valor não numérico e valor não positivo', () => {
  const r = parseCsvEntradas('data,valor,descricao\n2026-09-03,abc,X\n2026-09-04,0,Y')
  assert.match(r[0].erro ?? '', /valor/i)
  assert.match(r[1].erro ?? '', /valor/i)
})

test('ignora linhas em branco', () => {
  const r = parseCsvEntradas('data,valor,descricao\n\n2026-09-03,500,R\n\n')
  assert.equal(r.length, 1)
})

test('o número da linha é o do arquivo, mesmo com linhas em branco', () => {
  // Linha 1 = cabeçalho, 2 = vazia, 3 = boa, 4 = ruim.
  const texto = 'data,valor,descricao\n\n2026-09-03,500,Boa\n32/13/2026,500,Ruim'
  const r = parseCsvEntradas(texto)
  assert.equal(r[0].linha, 3)
  assert.equal(r[1].linha, 4)
})

test('respeita aspas em campo que contém o separador', () => {
  const r = parseCsvEntradas('data,valor,descricao\n2026-09-03,500,"Reserva, 3 noites"')
  assert.equal(r[0].descricao, 'Reserva, 3 noites')
  assert.equal(r[0].erro, null)
})

test('aspas duplicadas viram uma aspa literal', () => {
  const linha = 'data;valor;descricao\n03/09/2026;500;"Studio ""Alto da Gloria"""'
  const r = parseCsvEntradas(linha)
  assert.equal(r[0].descricao, 'Studio "Alto da Gloria"')
})

test('cabeçalho entre aspas é reconhecido', () => {
  const r = parseCsvEntradas('"data","valor","descricao"\n2026-09-03,500,R')
  assert.equal(r[0].valorCentavos, 50000)
  assert.equal(r[0].erro, null)
})

test('lança quando o cabeçalho não tem as colunas obrigatórias', () => {
  assert.throws(() => parseCsvEntradas('a,b,c\n1,2,3'), /cabeçalho/i)
})

test('lança quando o texto está vazio', () => {
  assert.throws(() => parseCsvEntradas('   '), /vazio/i)
})

test('marcarDuplicados acusa linha já existente no banco', () => {
  const existentes = [
    {
      id: '1', tipo: 'entrada', data: '2026-09-03', valorCentavos: 50000,
      descricao: 'R', categoriaId: null, origem: 'Airbnb', noites: null,
      hospedes: null, criadoEm: '',
    } satisfies Lancamento,
  ]
  const linhas = parseCsvEntradas('data,valor,descricao\n2026-09-03,500,Outra descrição')
  const r = marcarDuplicados(linhas, existentes)
  assert.equal(r[0].duplicada, true)
})

test('marcarDuplicados acusa repetição dentro do próprio arquivo', () => {
  const linhas = parseCsvEntradas(
    'data,valor,descricao\n2026-09-03,500,A\n2026-09-03,500,B\n2026-09-04,500,C',
  )
  const r = marcarDuplicados(linhas, [])
  assert.equal(r[0].duplicada, false)
  assert.equal(r[1].duplicada, true)
  assert.equal(r[2].duplicada, false)
})

test('marcarDuplicados não marca linha com erro', () => {
  const linhas = parseCsvEntradas('data,valor,descricao\n2026-09-03,abc,A')
  const r = marcarDuplicados(linhas, [])
  assert.equal(r[0].duplicada, false)
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm test`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar**

```ts
import { parseValorBRL } from './dinheiro'
import type { Lancamento } from './tipos'

export type LinhaImport = {
  /** Número da linha no arquivo, contando o cabeçalho como 1. */
  linha: number
  data: string | null
  valorCentavos: number | null
  descricao: string
  noites: number | null
  hospedes: number | null
  erro: string | null
}

export type LinhaImportMarcada = LinhaImport & { duplicada: boolean }

/** Nomes alternativos que a planilha do usuário pode trazer. */
const ALIASES: Record<string, string> = {
  dia: 'data',
  total: 'valor',
  valor_total: 'valor',
  qtd_noites: 'noites',
  hospede: 'hospedes',
}

function normalizarCabecalho(nome: string): string {
  const limpo = nome
    .trim()
    .replace(/^"|"$/g, '')
    .toLowerCase()
    .normalize('NFD')
    // Tira acentos: "Descrição" e "descricao" viram a mesma coluna.
    .replace(/[̀-ͯ]/g, '')
  return ALIASES[limpo] ?? limpo
}

/** Detecta o separador contando ocorrências na linha de cabeçalho. */
function detectarSeparador(cabecalho: string): string {
  return (cabecalho.match(/;/g)?.length ?? 0) >
    (cabecalho.match(/,/g)?.length ?? 0)
    ? ';'
    : ','
}

/**
 * Divide uma linha respeitando aspas.
 * Um `split` puro quebraria "Reserva, 3 noites" no meio e engoliria metade da
 * descrição sem acusar erro nenhum — e o Excel põe aspas exatamente quando o
 * campo contém o separador, que numa descrição de reserva é o caso comum.
 */
function dividirLinha(linha: string, separador: string): string[] {
  const celulas: string[] = []
  let atual = ''
  let dentroDeAspas = false

  for (let i = 0; i < linha.length; i++) {
    const c = linha[i]

    if (c === '"') {
      // "" dentro de campo entre aspas representa uma aspa literal.
      if (dentroDeAspas && linha[i + 1] === '"') {
        atual += '"'
        i++
      } else {
        dentroDeAspas = !dentroDeAspas
      }
      continue
    }

    if (c === separador && !dentroDeAspas) {
      celulas.push(atual)
      atual = ''
      continue
    }

    atual += c
  }

  celulas.push(atual)
  return celulas
}

/** Aceita DD/MM/AAAA e AAAA-MM-DD. Devolve AAAA-MM-DD ou null. */
function parseData(bruto: string): string | null {
  const texto = bruto.trim()

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto)
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(texto)

  let ano: number, mes: number, dia: number
  if (iso) {
    ;[, ano, mes, dia] = [0, Number(iso[1]), Number(iso[2]), Number(iso[3])]
  } else if (br) {
    ;[, dia, mes, ano] = [0, Number(br[1]), Number(br[2]), Number(br[3])]
  } else {
    return null
  }

  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null
  // Valida o dia contra o mês de verdade (31/02 não existe).
  const d = new Date(Date.UTC(ano, mes - 1, dia))
  if (d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) return null

  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

function parseInteiroPositivo(bruto: string | undefined): number | null {
  if (bruto === undefined) return null
  const n = Number(bruto.trim())
  if (!Number.isInteger(n) || n <= 0) return null
  return n
}

/**
 * Converte o texto de um CSV de reservas em linhas validadas.
 * Não grava nada: devolve o que a tela de preview precisa mostrar.
 */
export function parseCsvEntradas(texto: string): LinhaImport[] {
  // Guarda o número original de cada linha ANTES de descartar as vazias. É esse
  // número que o preview mostra ao lado do erro, e ele precisa bater com o que
  // o usuário vê quando abre o arquivo.
  const numeradas = texto
    .split(/\r?\n/)
    .map((conteudo, indice) => ({ numero: indice + 1, conteudo }))
    .filter((l) => l.conteudo.trim() !== '')

  if (numeradas.length === 0) throw new Error('Arquivo vazio.')

  const cabecalho = numeradas[0]
  const separador = detectarSeparador(cabecalho.conteudo)
  const colunas = dividirLinha(cabecalho.conteudo, separador).map(normalizarCabecalho)

  for (const obrigatoria of ['data', 'valor', 'descricao']) {
    if (!colunas.includes(obrigatoria)) {
      throw new Error(
        `Cabeçalho inválido: falta a coluna "${obrigatoria}". ` +
          `Esperado: data, valor, descricao (e opcionalmente noites, hospedes).`,
      )
    }
  }

  const indice = (nome: string) => colunas.indexOf(nome)

  return numeradas.slice(1).map(({ numero, conteudo }) => {
    const celulas = dividirLinha(conteudo, separador)
    const pegar = (nome: string) => {
      const i = indice(nome)
      return i >= 0 ? (celulas[i] ?? '').trim() : ''
    }

    const data = parseData(pegar('data'))
    const valorCentavos = parseValorBRL(pegar('valor'))

    let erro: string | null = null
    if (data === null) erro = `Data inválida: "${pegar('data')}"`
    else if (valorCentavos === null) erro = `Valor inválido: "${pegar('valor')}"`

    return {
      linha: numero,
      data,
      valorCentavos,
      descricao: pegar('descricao'),
      noites: indice('noites') >= 0 ? parseInteiroPositivo(pegar('noites')) : null,
      hospedes: indice('hospedes') >= 0 ? parseInteiroPositivo(pegar('hospedes')) : null,
      erro,
    }
  })
}

/**
 * Marca linhas prováveis duplicatas por data + valor, contra o banco e contra
 * as linhas anteriores do próprio arquivo. A primeira ocorrência dentro do
 * arquivo não é marcada; as repetições são.
 */
/** Só precisa destes três campos — assim o chamador pode buscar menos do banco. */
export type LancamentoExistente = Pick<Lancamento, 'tipo' | 'data' | 'valorCentavos'>

export function marcarDuplicados(
  linhas: LinhaImport[],
  existentes: LancamentoExistente[],
): LinhaImportMarcada[] {
  const vistos = new Set(
    existentes
      .filter((l) => l.tipo === 'entrada')
      .map((l) => `${l.data}|${l.valorCentavos}`),
  )

  return linhas.map((linha) => {
    if (linha.erro !== null || linha.data === null || linha.valorCentavos === null) {
      return { ...linha, duplicada: false }
    }
    const chave = `${linha.data}|${linha.valorCentavos}`
    const duplicada = vistos.has(chave)
    vistos.add(chave)
    return { ...linha, duplicada }
  })
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm test`
Expected: PASS em toda a suíte (dinheiro, competência, totais, pendências, csv).

- [ ] **Step 5: Commit**

```bash
git add lib/csv.ts lib/csv.test.ts
git commit -m "feat: interpreta CSV de reservas com formatos pt-BR"
```

---

## Chunk 2: Banco e tranca de acesso

Implementa a spec §3 e §4. No fim do chunk existe um banco criado, o app só abre
com PIN, e o navegador não tem como falar com o Supabase diretamente.

### Task 8: Schema do banco

**Files:**
- Create: `supabase/schema.sql`

Este arquivo não roda por código: você cola no SQL Editor do Supabase. É
idempotente (`if not exists`), então pode ser rodado de novo sem estragar nada.

- [ ] **Step 1: Criar o projeto no Supabase**

Em supabase.com: novo projeto, região São Paulo, anote a senha do banco.
Em *Project Settings → API*, copie a **Project URL** e a **service_role key**
(não a `anon`).

- [ ] **Step 2: Escrever o schema**

```sql
-- Schema do app financeiro do studio. Idempotente: pode rodar de novo.
create extension if not exists "pgcrypto";

create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cor text not null default '#94a3b8',
  arquivada boolean not null default false
);

create table if not exists lancamentos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('entrada', 'saida')),
  data date not null,
  valor_centavos integer not null check (valor_centavos > 0),
  descricao text not null default '',
  categoria_id uuid references categorias(id),
  -- Sem DEFAULT de propósito: um default dispararia em INSERT de saída e a
  -- constraint campos_por_tipo rejeitaria a linha. 'Airbnb' é pré-preenchido
  -- no formulário de entrada, não no banco.
  origem text,
  noites integer check (noites is null or noites > 0),
  hospedes integer check (hospedes is null or hospedes > 0),
  criado_em timestamptz not null default now(),
  constraint campos_por_tipo check (
    (tipo = 'saida'
      and categoria_id is not null
      and origem is null
      and noites is null
      and hospedes is null)
    or
    (tipo = 'entrada'
      and categoria_id is null
      and origem is not null)
  )
);

create index if not exists lancamentos_data_idx on lancamentos (data desc, criado_em desc);

create table if not exists gastos_fixos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  valor_referencia_centavos integer not null check (valor_referencia_centavos > 0),
  categoria_id uuid not null references categorias(id),
  arquivada boolean not null default false,
  competencia_inicial text not null check (competencia_inicial ~ '^\d{4}-\d{2}$')
);

-- A chave primária composta é o que impede lançar o mesmo gasto fixo duas vezes
-- no mesmo mês, inclusive a partir de dois dispositivos simultâneos.
create table if not exists gastos_fixos_lancados (
  gasto_fixo_id uuid not null references gastos_fixos(id) on delete cascade,
  competencia text not null check (competencia ~ '^\d{4}-\d{2}$'),
  -- CASCADE: excluir o lançamento no extrato devolve o gasto fixo para a fila.
  lancamento_id uuid not null references lancamentos(id) on delete cascade,
  primary key (gasto_fixo_id, competencia)
);

create table if not exists tentativas_pin (
  ip text not null,
  janela text not null,
  tentativas integer not null default 0,
  primary key (ip, janela)
);

-- RLS ligado em todas as tabelas, sem nenhuma policy: qualquer chave que não
-- seja a service_role não lê nem escreve nada. A service_role ignora RLS por
-- natureza, e é por isso que ela nunca sai do servidor.
alter table categorias enable row level security;
alter table lancamentos enable row level security;
alter table gastos_fixos enable row level security;
alter table gastos_fixos_lancados enable row level security;
alter table tentativas_pin enable row level security;

-- Seed das categorias.
insert into categorias (nome, cor)
select * from (values
  ('Limpeza',             '#38bdf8'),
  ('Manutenção',          '#fb923c'),
  ('Compras / utensílios','#a78bfa'),
  ('Contas fixas',        '#34d399'),
  ('Outros',              '#94a3b8')
) as v(nome, cor)
where not exists (select 1 from categorias);

-- Seed dos gastos fixos. competencia_inicial no fuso do usuário, não em UTC.
insert into gastos_fixos (nome, valor_referencia_centavos, categoria_id, competencia_inicial)
select
  v.nome,
  v.valor,
  (select id from categorias where nome = 'Contas fixas' limit 1),
  to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM')
from (values
  ('Internet',   9800),
  ('PriceLabs', 11000)
) as v(nome, valor)
where not exists (select 1 from gastos_fixos)
  -- Sem este exists, num banco onde categorias já tem linhas mas não tem
  -- "Contas fixas", o subselect acima vira NULL e o insert estoura no not null.
  and exists (select 1 from categorias where nome = 'Contas fixas');

-- Incremento atômico do contador de tentativas de PIN.
-- Ler e depois gravar em duas etapas permitiria que duas requisições
-- simultâneas lessem 2 e gravassem 3 — e um atacante disparando em paralelo
-- ficaria indefinidamente abaixo do limite.
create or replace function registrar_falha_pin(p_ip text, p_janela text)
returns integer
language sql
as $$
  insert into tentativas_pin (ip, janela, tentativas)
  values (p_ip, p_janela, 1)
  on conflict (ip, janela)
  do update set tentativas = tentativas_pin.tentativas + 1
  returning tentativas;
$$;
```

- [ ] **Step 3: Rodar no Supabase**

Cole o arquivo inteiro no *SQL Editor* e execute.

- [ ] **Step 4: Verificar que o seed entrou**

Rode no SQL Editor:

```sql
select nome from categorias order by nome;
select nome, valor_referencia_centavos, competencia_inicial from gastos_fixos;
```

Expected: 5 categorias e 2 gastos fixos, com `competencia_inicial` no mês corrente.

- [ ] **Step 5: Verificar que a constraint funciona**

```sql
-- Deve FALHAR: saída sem categoria.
insert into lancamentos (tipo, data, valor_centavos, descricao)
values ('saida', '2026-09-01', 1000, 'teste');
```

Expected: erro `violates check constraint "campos_por_tipo"`. Se este insert
passar, a constraint está errada e o resto do app vai gravar lixo — pare e
corrija antes de seguir.

- [ ] **Step 6: Preencher o `.env.local`**

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
APP_PIN=123456
APP_SESSION_SECRET=<saída de: openssl rand -base64 32>
```

Use um PIN de verdade, com 6 dígitos ou mais. Confirme que este arquivo **não**
aparece em `git status`.

- [ ] **Step 7: Commit**

```bash
git add supabase/schema.sql .env.local.example
git commit -m "feat: cria schema do banco com RLS e seed inicial"
```

---

### Task 9: Token de sessão assinado

**Files:**
- Create: `lib/sessao.ts`
- Test: `lib/sessao.test.ts`

Implementa a spec §3. É a única peça de segurança do app, e por isso mora em
`lib/` com teste.

**Usa Web Crypto (`crypto.subtle`), não `node:crypto`.** O middleware do Next
roda no runtime Edge, onde `node:crypto` e `Buffer` não existem. Web Crypto
funciona nos dois lugares — inclusive no `node:test`.

- [ ] **Step 1: Escrever os testes que falham**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { assinarToken, comparaSegura, verificarToken } from './sessao'

const SEGREDO = 'segredo-de-teste-nao-usar-em-producao'
const DAQUI_A_UM_DIA = Date.now() + 86_400_000

test('token recém-assinado é válido', async () => {
  const token = await assinarToken(DAQUI_A_UM_DIA, SEGREDO)
  assert.equal(await verificarToken(token, SEGREDO), true)
})

test('token expirado é rejeitado', async () => {
  const token = await assinarToken(Date.now() - 1000, SEGREDO)
  assert.equal(await verificarToken(token, SEGREDO), false)
})

test('token assinado com outro segredo é rejeitado', async () => {
  const token = await assinarToken(DAQUI_A_UM_DIA, SEGREDO)
  assert.equal(await verificarToken(token, 'outro-segredo'), false)
})

test('token com payload adulterado é rejeitado', async () => {
  // O atacante estende a validade mas não sabe reassinar.
  const token = await assinarToken(Date.now() - 1000, SEGREDO)
  const assinatura = token.split('.')[1]
  const forjado = `${Date.now() + 999_999}.${assinatura}`
  assert.equal(await verificarToken(forjado, SEGREDO), false)
})

test('valores que não são token são rejeitados sem lançar', async () => {
  for (const lixo of ['', '1', 'a.b.c', 'abc.def', '.', 'auth=1']) {
    assert.equal(await verificarToken(lixo, SEGREDO), false, `falhou em "${lixo}"`)
  }
})

test('comparaSegura compara conteúdo, não referência', () => {
  assert.equal(comparaSegura('123456', '123456'), true)
  assert.equal(comparaSegura('123456', '123457'), false)
  assert.equal(comparaSegura('123456', '12345'), false)
  assert.equal(comparaSegura('', ''), true)
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm test`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar**

```ts
const CODIFICADOR = new TextEncoder()

/** Duração da sessão: 180 dias. Você digita o PIN uma vez por aparelho. */
export const DURACAO_SESSAO_MS = 180 * 24 * 60 * 60 * 1000

export const COOKIE_SESSAO = 'studio_sessao'

async function importarChave(segredo: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    CODIFICADOR.encode(segredo),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

function paraBase64Url(bytes: ArrayBuffer): string {
  let binario = ''
  for (const byte of new Uint8Array(bytes)) binario += String.fromCharCode(byte)
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function assinar(payload: string, segredo: string): Promise<string> {
  const chave = await importarChave(segredo)
  const bytes = await crypto.subtle.sign('HMAC', chave, CODIFICADOR.encode(payload))
  return paraBase64Url(bytes)
}

/** Comparação de tempo constante. Evita descobrir o segredo caractere a caractere. */
export function comparaSegura(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diferenca = 0
  for (let i = 0; i < a.length; i++) {
    diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diferenca === 0
}

/**
 * Token de sessão: a data de expiração, mais um HMAC dela.
 * Guardar só uma flag (`auth=1`) seria inútil — qualquer visitante definiria o
 * cookie no próprio navegador e o middleware deixaria passar.
 */
export async function assinarToken(expiraEm: number, segredo: string): Promise<string> {
  const payload = String(expiraEm)
  return `${payload}.${await assinar(payload, segredo)}`
}

export async function verificarToken(
  token: string,
  segredo: string,
  agora: number = Date.now(),
): Promise<boolean> {
  const partes = token.split('.')
  if (partes.length !== 2) return false

  const [payload, assinatura] = partes
  if (!/^\d+$/.test(payload)) return false

  const esperada = await assinar(payload, segredo)
  if (!comparaSegura(assinatura, esperada)) return false

  return agora < Number(payload)
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/sessao.ts lib/sessao.test.ts
git commit -m "feat: assina e verifica token de sessão"
```

---

### Task 10: Mapeamento entre banco e domínio

**Files:**
- Create: `lib/mapeamento.ts`
- Test: `lib/mapeamento.test.ts`

O Postgres usa `snake_case` e o domínio usa `camelCase`. Este módulo é a única
tradução entre os dois — se ela estiver espalhada pelos route handlers, cada um
vai errar de um jeito diferente.

- [ ] **Step 1: Escrever os testes que falham**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { paraLancamento, paraLinhaLancamento } from './mapeamento'

test('paraLancamento converte entrada do banco', () => {
  const linha = {
    id: 'abc',
    tipo: 'entrada',
    data: '2026-09-03',
    valor_centavos: 50000,
    descricao: 'Reserva 3 noites',
    categoria_id: null,
    origem: 'Airbnb',
    noites: 3,
    hospedes: 2,
    criado_em: '2026-09-03T12:00:00Z',
  }
  assert.deepEqual(paraLancamento(linha), {
    id: 'abc',
    tipo: 'entrada',
    data: '2026-09-03',
    valorCentavos: 50000,
    descricao: 'Reserva 3 noites',
    categoriaId: null,
    origem: 'Airbnb',
    noites: 3,
    hospedes: 2,
    criadoEm: '2026-09-03T12:00:00Z',
  })
})

test('paraLinhaLancamento zera os campos do outro tipo numa saída', () => {
  const linha = paraLinhaLancamento({
    tipo: 'saida',
    data: '2026-09-05',
    valorCentavos: 9800,
    descricao: 'Internet',
    categoriaId: 'cat-1',
    origem: 'Airbnb',
    noites: 3,
    hospedes: 2,
  })
  assert.deepEqual(linha, {
    tipo: 'saida',
    data: '2026-09-05',
    valor_centavos: 9800,
    descricao: 'Internet',
    categoria_id: 'cat-1',
    origem: null,
    noites: null,
    hospedes: null,
  })
})

test('paraLinhaLancamento zera a categoria numa entrada', () => {
  const linha = paraLinhaLancamento({
    tipo: 'entrada',
    data: '2026-09-03',
    valorCentavos: 50000,
    descricao: 'Reserva',
    categoriaId: 'cat-1',
    origem: 'Airbnb',
    noites: null,
    hospedes: null,
  })
  assert.equal(linha.categoria_id, null)
  assert.equal(linha.origem, 'Airbnb')
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm test`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar**

```ts
import type { Lancamento } from './tipos'

export type LinhaLancamento = {
  id: string
  tipo: string
  data: string
  valor_centavos: number
  descricao: string
  categoria_id: string | null
  origem: string | null
  noites: number | null
  hospedes: number | null
  criado_em: string
}

export type EntradaLancamento = Omit<Lancamento, 'id' | 'criadoEm'>

export function paraLancamento(linha: LinhaLancamento): Lancamento {
  return {
    id: linha.id,
    tipo: linha.tipo === 'entrada' ? 'entrada' : 'saida',
    data: linha.data,
    valorCentavos: linha.valor_centavos,
    descricao: linha.descricao,
    categoriaId: linha.categoria_id,
    origem: linha.origem,
    noites: linha.noites,
    hospedes: linha.hospedes,
    criadoEm: linha.criado_em,
  }
}

/**
 * Converte para linha do banco, zerando os campos que não pertencem ao tipo.
 * Sem isso, um formulário que já teve os dois modos preenchidos mandaria
 * `origem` numa saída e a constraint `campos_por_tipo` rejeitaria o insert.
 */
export function paraLinhaLancamento(entrada: EntradaLancamento) {
  const ehEntrada = entrada.tipo === 'entrada'
  return {
    tipo: entrada.tipo,
    data: entrada.data,
    valor_centavos: entrada.valorCentavos,
    descricao: entrada.descricao,
    categoria_id: ehEntrada ? null : entrada.categoriaId,
    origem: ehEntrada ? entrada.origem : null,
    noites: ehEntrada ? entrada.noites : null,
    hospedes: ehEntrada ? entrada.hospedes : null,
  }
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/mapeamento.ts lib/mapeamento.test.ts
git commit -m "feat: traduz linhas do banco para o domínio"
```

---

### Task 11: Cliente Supabase do servidor

**Files:**
- Create: `lib/supabase.ts`

Sem teste: é configuração de cliente, não lógica.

- [ ] **Step 1: Escrever o módulo**

```ts
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
```

- [ ] **Step 2: Verificar**

Run: `npm run typecheck`
Expected: passa.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase.ts
git commit -m "feat: adiciona cliente Supabase restrito ao servidor"
```

---

### Task 12: Login por PIN com limite de tentativas

**Files:**
- Create: `app/api/sessao/route.ts`
- Create: `lib/limite-tentativas.ts`

O contador de tentativas vive numa tabela do Supabase, não em memória: na Vercel,
cada requisição pode cair numa instância diferente, e um `Map` em memória não
limitaria nada.

- [ ] **Step 1: Escrever o controle de tentativas**

`lib/limite-tentativas.ts`:

```ts
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
```

- [ ] **Step 2: Escrever o route handler**

`app/api/sessao/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { bloqueado, ipDoPedido, registrarFalha } from '@/lib/limite-tentativas'
import { COOKIE_SESSAO, DURACAO_SESSAO_MS, assinarToken, comparaSegura } from '@/lib/sessao'

export async function POST(request: Request) {
  const pinEsperado = process.env.APP_PIN
  const segredo = process.env.APP_SESSION_SECRET
  if (!pinEsperado || !segredo) {
    return NextResponse.json({ erro: 'Servidor mal configurado.' }, { status: 500 })
  }

  const ip = ipDoPedido(request)

  if (await bloqueado(ip)) {
    return NextResponse.json(
      { erro: 'Muitas tentativas. Tente de novo em 15 minutos.' },
      { status: 429 },
    )
  }

  let pin: unknown
  try {
    pin = ((await request.json()) as { pin?: unknown }).pin
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  if (typeof pin !== 'string' || !comparaSegura(pin, pinEsperado)) {
    await registrarFalha(ip)
    // Mensagem genérica: não revela se o PIN existe, tem outro tamanho, etc.
    return NextResponse.json({ erro: 'PIN incorreto.' }, { status: 401 })
  }

  const expiraEm = Date.now() + DURACAO_SESSAO_MS
  const resposta = NextResponse.json({ ok: true })
  resposta.cookies.set(COOKIE_SESSAO, await assinarToken(expiraEm, segredo), {
    httpOnly: true,
    // Em produção sempre secure. Em dev fica false porque o localhost do
    // Step 3 da Task 13 é http, e um cookie secure simplesmente não seria
    // gravado ali — você não conseguiria testar a tranca.
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(DURACAO_SESSAO_MS / 1000),
  })
  return resposta
}
```

- [ ] **Step 3: Verificar**

Run: `npm run typecheck`
Expected: passa.

- [ ] **Step 4: Commit**

```bash
git add app/api/sessao/route.ts lib/limite-tentativas.ts
git commit -m "feat: autentica por PIN com limite de tentativas"
```

---

### Task 13: Middleware e tela de entrada

**Files:**
- Create: `middleware.ts`
- Create: `app/entrar/page.tsx`

- [ ] **Step 1: Escrever o middleware**

`proxy.ts` (na raiz do projeto, não em `app/`).

> **Next 16 renomeou isto.** A convenção `middleware.ts` / `export function
> middleware` foi deprecada em favor de `proxy.ts` / `export function proxy` —
> mesmo comportamento, mesmo matcher. Se o seu Next ainda for 15, use
> `middleware.ts` e `export async function middleware`. O codemod oficial
> converte: `npx @next/codemod@canary middleware-to-proxy .`

```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { COOKIE_SESSAO, verificarToken } from '@/lib/sessao'

export async function proxy(request: NextRequest) {
  const segredo = process.env.APP_SESSION_SECRET
  if (!segredo) {
    return new NextResponse('Servidor mal configurado.', { status: 500 })
  }

  const token = request.cookies.get(COOKIE_SESSAO)?.value
  if (token && (await verificarToken(token, segredo))) {
    return NextResponse.next()
  }

  // Chamada de API recebe 401, não redirect. Um redirect seria seguido pelo
  // fetch, que receberia o HTML da tela de login com status 200 — e o
  // dashboard mostraria "não foi possível carregar" em vez de mandar o usuário
  // para o login.
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ erro: 'Sessão expirada.' }, { status: 401 })
  }

  return NextResponse.redirect(new URL('/entrar', request.url))
}

// Protege tudo, menos a própria tela de entrada, o endpoint que valida o PIN,
// os arquivos estáticos e os ícones.
export const config = {
  matcher: [
    '/((?!entrar|api/sessao|_next/static|_next/image|_next/webpack-hmr|favicon.ico|manifest.json|icon|apple-icon).*)',
  ],
}
```

- [ ] **Step 2: Escrever a tela de entrada**

`app/entrar/page.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function Entrar() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    setEnviando(true)
    setErro(null)

    const resposta = await fetch('/api/sessao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    })

    if (resposta.ok) {
      router.replace('/')
      router.refresh()
      return
    }

    const corpo = (await resposta.json()) as { erro?: string }
    setErro(corpo.erro ?? 'Não foi possível entrar.')
    setPin('')
    setEnviando(false)
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <form onSubmit={enviar} className="flex w-full max-w-xs flex-col gap-6">
        <h1 className="text-center text-lg font-medium">Studio</h1>
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="PIN"
          className="rounded-xl bg-slate-100 px-4 py-3 text-center text-2xl tracking-[0.3em] tabular-nums outline-none focus:ring-2 focus:ring-slate-400"
        />
        {erro && <p className="text-center text-sm text-red-600">{erro}</p>}
        <button
          type="submit"
          disabled={enviando || pin.length === 0}
          className="rounded-xl bg-slate-900 py-3 text-white disabled:opacity-40"
        >
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 3: Verificar na prática que a tranca funciona**

```bash
npm run dev
```

Verifique, nesta ordem:

1. Abrir `http://localhost:3000/` redireciona para `/entrar`.
2. PIN errado mostra "PIN incorreto." e não entra.
3. PIN certo entra e mostra a home.
4. Recarregar a página continua dentro (o cookie persiste).
5. No DevTools → Application → Cookies, `studio_sessao` tem `HttpOnly` marcado e
   o valor é `<números>.<base64>`, não `1` nem `true`.
6. Apagar o cookie e recarregar volta para `/entrar`.

Se o passo 1 não redirecionar, confira o `matcher` do middleware.

- [ ] **Step 4: Commit**

```bash
git add proxy.ts app/entrar/page.tsx
git commit -m "feat: protege as rotas com PIN e cookie de sessão"
```

---

## Chunk 3: API de dados e CRUD de lançamentos

Implementa a prioridade 1 da spec original. No fim do chunk dá para criar,
editar e excluir entradas e saídas.

**Decisão de desenho que vale entender antes de começar:** o endpoint do mês
busca **todos** os lançamentos e calcula tudo com as funções puras de `lib/`, em
vez de somar no Postgres. Com 400–600 linhas isso é instantâneo, e mantém a
matemática num único lugar já coberto por teste. Se um dia o volume crescer uma
ordem de grandeza, aí sim vale mover as somas para o banco.

### Task 14: Endpoint do mês

**Files:**
- Create: `app/api/mes/route.ts`

- [ ] **Step 1: Escrever o handler**

```ts
import { NextResponse } from 'next/server'
import { competenciaAtual, competenciaDe } from '@/lib/competencia'
import { paraLancamento, type LinhaLancamento } from '@/lib/mapeamento'
import { clienteServidor } from '@/lib/supabase'
import { saidasPorCategoria, saldoAcumulado, totaisDoMes } from '@/lib/totais'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const competencia = searchParams.get('competencia') ?? competenciaAtual()

  if (!/^\d{4}-\d{2}$/.test(competencia)) {
    return NextResponse.json({ erro: 'Competência inválida.' }, { status: 400 })
  }

  const supabase = clienteServidor()

  const [lancamentosRes, categoriasRes] = await Promise.all([
    supabase.from('lancamentos').select('*').order('data', { ascending: false }).order('criado_em', { ascending: false }),
    supabase.from('categorias').select('*').order('nome'),
  ])

  if (lancamentosRes.error || categoriasRes.error) {
    return NextResponse.json(
      { erro: lancamentosRes.error?.message ?? categoriasRes.error?.message },
      { status: 500 },
    )
  }

  const todos = (lancamentosRes.data as LinhaLancamento[]).map(paraLancamento)

  return NextResponse.json({
    competencia,
    lancamentos: todos.filter((l) => competenciaDe(l.data) === competencia),
    totais: totaisDoMes(todos, competencia),
    saldoTotalCentavos: saldoAcumulado(todos),
    porCategoria: saidasPorCategoria(todos, competencia),
    categorias: categoriasRes.data,
  })
}
```

- [ ] **Step 2: Verificar na prática**

Com `npm run dev` rodando e já autenticado no navegador, abra:
`http://localhost:3000/api/mes?competencia=2026-09`

Expected: JSON com `totais` zerados (banco ainda vazio), `categorias` com as 5 do
seed, e `lancamentos: []`.

Se voltar um redirect para `/entrar`, você não está autenticado — entre pelo
navegador primeiro.

- [ ] **Step 3: Commit**

```bash
git add app/api/mes/route.ts
git commit -m "feat: expõe endpoint com os dados do mês"
```

---

### Task 15: CRUD de lançamentos

**Files:**
- Create: `app/api/lancamentos/validacao.ts`
- Create: `app/api/lancamentos/route.ts`
- Create: `app/api/lancamentos/[id]/route.ts`

- [ ] **Step 1: Escrever a validação compartilhada**

`app/api/lancamentos/validacao.ts`:

```ts
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
```

- [ ] **Step 2: Escrever o handler de criação**

`app/api/lancamentos/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { paraLancamento, paraLinhaLancamento, type LinhaLancamento } from '@/lib/mapeamento'
import { clienteServidor } from '@/lib/supabase'
import { validarCorpo } from './validacao'

export async function POST(request: Request) {
  let corpo: unknown
  try {
    corpo = await request.json()
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  const validacao = validarCorpo(corpo)
  if (!validacao.ok) {
    return NextResponse.json({ erro: validacao.erro }, { status: 400 })
  }

  const { data, error } = await clienteServidor()
    .from('lancamentos')
    .insert(paraLinhaLancamento(validacao.valor))
    .select()
    .single()

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json(paraLancamento(data as LinhaLancamento), { status: 201 })
}
```

- [ ] **Step 3: Escrever os handlers de edição e exclusão**

`app/api/lancamentos/[id]/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { competenciaDe } from '@/lib/competencia'
import { paraLancamento, paraLinhaLancamento, type LinhaLancamento } from '@/lib/mapeamento'
import { clienteServidor } from '@/lib/supabase'
import { validarCorpo } from '../validacao'

type Contexto = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Contexto) {
  const { id } = await params

  let corpo: unknown
  try {
    corpo = await request.json()
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  const validacao = validarCorpo(corpo)
  if (!validacao.ok) {
    return NextResponse.json({ erro: validacao.erro }, { status: 400 })
  }

  const supabase = clienteServidor()

  // Spec §6: lançamento gerado pela fila não pode mudar de mês, senão a linha
  // de controle apontaria para um mês onde a despesa não está mais.
  const { data: controle } = await supabase
    .from('gastos_fixos_lancados')
    .select('competencia')
    .eq('lancamento_id', id)
    .maybeSingle()

  if (controle && competenciaDe(validacao.valor.data) !== controle.competencia) {
    return NextResponse.json(
      {
        erro:
          'Este lançamento veio da lista de gastos fixos e não pode mudar de mês. ' +
          'Para movê-lo, exclua e lance de novo.',
      },
      { status: 409 },
    )
  }

  const { data, error } = await supabase
    .from('lancamentos')
    .update(paraLinhaLancamento(validacao.valor))
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json(paraLancamento(data as LinhaLancamento))
}

export async function DELETE(_request: Request, { params }: Contexto) {
  const { id } = await params

  // A linha em gastos_fixos_lancados cai junto por ON DELETE CASCADE, o que
  // devolve o gasto fixo para a fila de pendências do mês.
  const { error } = await clienteServidor().from('lancamentos').delete().eq('id', id)

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 4: Verificar**

Run: `npm run typecheck`
Expected: passa.

- [ ] **Step 5: Commit**

```bash
git add app/api/lancamentos
git commit -m "feat: cria, edita e exclui lançamentos"
```

---

### Task 16: Modal de lançamento

**Files:**
- Create: `components/ModalLancamento.tsx`
- Create: `components/CampoValor.tsx`

O mesmo componente cria e edita (spec §6). `CampoValor` é separado porque é a
única borda texto→centavos da interface e vai ser usado também na fila de
pendências e no import.

- [ ] **Step 1: Escrever o campo de valor**

`components/CampoValor.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { formatCentavos, parseValorBRL } from '@/lib/dinheiro'

type Props = {
  valorCentavos: number | null
  onChange: (centavos: number | null) => void
  autoFocus?: boolean
}

export function CampoValor({ valorCentavos, onChange, autoFocus }: Props) {
  const [texto, setTexto] = useState(
    valorCentavos === null ? '' : formatCentavos(valorCentavos).replace('R$', '').trim(),
  )

  function digitou(bruto: string) {
    setTexto(bruto)
    onChange(parseValorBRL(bruto))
  }

  const invalido = texto.trim() !== '' && parseValorBRL(texto) === null

  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-slate-500">Valor</span>
      <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3">
        <span className="text-slate-400">R$</span>
        <input
          autoFocus={autoFocus}
          inputMode="decimal"
          value={texto}
          onChange={(e) => digitou(e.target.value)}
          placeholder="0,00"
          className="w-full bg-transparent text-right text-xl tabular-nums outline-none"
        />
      </div>
      {invalido && <span className="text-xs text-red-600">Valor inválido.</span>}
    </label>
  )
}
```

- [ ] **Step 2: Escrever o modal**

`components/ModalLancamento.tsx`:

```tsx
'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { hojeEmSaoPaulo } from '@/lib/competencia'
import type { Categoria, Lancamento, TipoLancamento } from '@/lib/tipos'
import { CampoValor } from './CampoValor'

type Props = {
  aberto: boolean
  categorias: Categoria[]
  /** Preenchido quando está editando; null quando está criando. */
  lancamento: Lancamento | null
  onFechar: () => void
  onSalvo: () => void
}

export function ModalLancamento({ aberto, categorias, lancamento, onFechar, onSalvo }: Props) {
  const [tipo, setTipo] = useState<TipoLancamento>(lancamento?.tipo ?? 'entrada')
  const [data, setData] = useState(lancamento?.data ?? hojeEmSaoPaulo())
  const [valorCentavos, setValorCentavos] = useState<number | null>(
    lancamento?.valorCentavos ?? null,
  )
  const [descricao, setDescricao] = useState(lancamento?.descricao ?? '')
  const [categoriaId, setCategoriaId] = useState(lancamento?.categoriaId ?? '')
  const [origem, setOrigem] = useState(lancamento?.origem ?? 'Airbnb')
  const [noites, setNoites] = useState(lancamento?.noites?.toString() ?? '')
  const [hospedes, setHospedes] = useState(lancamento?.hospedes?.toString() ?? '')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const ativas = categorias.filter((c) => !c.arquivada)

  async function salvar() {
    if (valorCentavos === null) {
      setErro('Informe um valor maior que zero.')
      return
    }
    if (tipo === 'saida' && categoriaId === '') {
      setErro('Escolha uma categoria.')
      return
    }

    setSalvando(true)
    setErro(null)

    const corpo = {
      tipo,
      data,
      valorCentavos,
      descricao,
      categoriaId: tipo === 'saida' ? categoriaId : null,
      origem: tipo === 'entrada' ? origem : null,
      noites: tipo === 'entrada' && noites !== '' ? Number(noites) : null,
      hospedes: tipo === 'entrada' && hospedes !== '' ? Number(hospedes) : null,
    }

    const resposta = await fetch(
      lancamento ? `/api/lancamentos/${lancamento.id}` : '/api/lancamentos',
      {
        method: lancamento ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      },
    )

    setSalvando(false)

    if (!resposta.ok) {
      const c = (await resposta.json()) as { erro?: string }
      setErro(c.erro ?? 'Não foi possível salvar.')
      return
    }

    onSalvo()
    onFechar()
  }

  async function excluir() {
    if (!lancamento) return
    if (!confirm('Excluir este lançamento?')) return

    const resposta = await fetch(`/api/lancamentos/${lancamento.id}`, { method: 'DELETE' })
    if (!resposta.ok) {
      setErro('Não foi possível excluir.')
      return
    }
    onSalvo()
    onFechar()
  }

  return (
    <AnimatePresence>
      {aberto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onFechar}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-md flex-col gap-4 rounded-t-3xl bg-white p-6 sm:rounded-3xl"
          >
            <div className="flex gap-2 rounded-xl bg-slate-100 p-1">
              {(['entrada', 'saida'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  className={`flex-1 rounded-lg py-2 text-sm transition-colors ${
                    tipo === t ? 'bg-white shadow-sm' : 'text-slate-500'
                  }`}
                >
                  {t === 'entrada' ? 'Entrada' : 'Saída'}
                </button>
              ))}
            </div>

            <CampoValor autoFocus valorCentavos={valorCentavos} onChange={setValorCentavos} />

            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Data</span>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="rounded-xl bg-slate-100 px-4 py-3 outline-none"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Descrição</span>
              <input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder={tipo === 'entrada' ? 'Reserva 3 noites' : 'Compra de toalhas'}
                className="rounded-xl bg-slate-100 px-4 py-3 outline-none"
              />
            </label>

            {tipo === 'saida' ? (
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-500">Categoria</span>
                <select
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(e.target.value)}
                  className="rounded-xl bg-slate-100 px-4 py-3 outline-none"
                >
                  <option value="">Escolha…</option>
                  {ativas.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </label>
            ) : (
              <>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-500">Origem</span>
                  <input
                    value={origem}
                    onChange={(e) => setOrigem(e.target.value)}
                    className="rounded-xl bg-slate-100 px-4 py-3 outline-none"
                  />
                </label>
                <div className="flex gap-4">
                  <label className="flex flex-1 flex-col gap-1">
                    <span className="text-xs text-slate-500">Noites</span>
                    <input
                      inputMode="numeric"
                      value={noites}
                      onChange={(e) => setNoites(e.target.value)}
                      className="rounded-xl bg-slate-100 px-4 py-3 tabular-nums outline-none"
                    />
                  </label>
                  <label className="flex flex-1 flex-col gap-1">
                    <span className="text-xs text-slate-500">Hóspedes</span>
                    <input
                      inputMode="numeric"
                      value={hospedes}
                      onChange={(e) => setHospedes(e.target.value)}
                      className="rounded-xl bg-slate-100 px-4 py-3 tabular-nums outline-none"
                    />
                  </label>
                </div>
              </>
            )}

            {erro && <p className="text-sm text-red-600">{erro}</p>}

            <div className="flex gap-3">
              {lancamento && (
                <button onClick={excluir} className="rounded-xl px-4 py-3 text-sm text-red-600">
                  Excluir
                </button>
              )}
              <button
                onClick={salvar}
                disabled={salvando}
                className="flex-1 rounded-xl bg-slate-900 py-3 text-white disabled:opacity-40"
              >
                {salvando ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

> **Atenção ao remontar o modal.** O estado inicial vem de `lancamento` via
> `useState`, que só lê o valor na primeira renderização — o mesmo vale para o
> texto dentro de `CampoValor`. Quem usa o modal **precisa** passar uma `key`
> que mude a cada abertura, e não apenas a cada alvo diferente:
> `key={lancamento?.id ?? 'novo'}` sozinho não basta, porque duas criações
> seguidas compartilham a key `'novo'` e a segunda abriria com o que foi
> digitado na primeira. A Task 20 resolve isso somando um contador de aberturas.

- [ ] **Step 3: Verificar**

Run: `npm run typecheck`
Expected: passa.

- [ ] **Step 4: Commit**

```bash
git add components/ModalLancamento.tsx components/CampoValor.tsx
git commit -m "feat: adiciona modal de lançamento com criação e edição"
```

---

## Chunk 4: Dashboard

Implementa a prioridade 2 da spec original: saldo, totais do mês, navegação por
mês e extrato. No fim do chunk o app é utilizável de ponta a ponta.

### Task 17: Valor animado

**Files:**
- Create: `components/ValorAnimado.tsx`

Conta do valor anterior ao novo em vez de trocar seco (spec §8). Usa
`tabular-nums`, sem o que o número treme horizontalmente enquanto conta — cada
dígito tem largura diferente numa fonte proporcional.

- [ ] **Step 1: Escrever o componente**

```tsx
'use client'

import { animate, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { formatCentavos } from '@/lib/dinheiro'

type Props = {
  centavos: number
  className?: string
}

export function ValorAnimado({ centavos, className }: Props) {
  // Começa em zero para que o primeiro carregamento também conte (spec §8),
  // e não apenas as trocas de mês.
  const [exibido, setExibido] = useState(0)
  const anterior = useRef(0)
  const reduzirMovimento = useReducedMotion()

  useEffect(() => {
    if (reduzirMovimento) {
      anterior.current = centavos
      setExibido(centavos)
      return
    }

    const controls = animate(anterior.current, centavos, {
      duration: 0.35,
      ease: 'easeOut',
      onUpdate: (v) => setExibido(Math.round(v)),
    })

    anterior.current = centavos
    return () => controls.stop()
  }, [centavos, reduzirMovimento])

  return <span className={`tabular-nums ${className ?? ''}`}>{formatCentavos(exibido)}</span>
}
```

- [ ] **Step 2: Verificar**

Run: `npm run typecheck`
Expected: passa.

- [ ] **Step 3: Commit**

```bash
git add components/ValorAnimado.tsx
git commit -m "feat: anima a contagem dos valores monetários"
```

---

### Task 18: Seletor de mês e cartões de total

**Files:**
- Create: `components/SeletorMes.tsx`
- Create: `components/CartoesTotais.tsx`

- [ ] **Step 1: Escrever o seletor de mês**

`components/SeletorMes.tsx`:

```tsx
'use client'

import { deslocarCompetencia, rotuloCompetencia } from '@/lib/competencia'

type Props = {
  competencia: string
  onMudar: (competencia: string, direcao: 1 | -1) => void
}

export function SeletorMes({ competencia, onMudar }: Props) {
  return (
    <div className="flex items-center justify-between">
      <button
        onClick={() => onMudar(deslocarCompetencia(competencia, -1), -1)}
        aria-label="Mês anterior"
        className="rounded-full px-3 py-2 text-slate-400 transition-colors hover:text-slate-900"
      >
        ‹
      </button>
      <span className="text-sm font-medium capitalize">{rotuloCompetencia(competencia)}</span>
      <button
        onClick={() => onMudar(deslocarCompetencia(competencia, 1), 1)}
        aria-label="Próximo mês"
        className="rounded-full px-3 py-2 text-slate-400 transition-colors hover:text-slate-900"
      >
        ›
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Escrever os cartões de total**

`components/CartoesTotais.tsx`:

```tsx
'use client'

import type { TotaisMes } from '@/lib/totais'
import { ValorAnimado } from './ValorAnimado'

type Props = {
  totais: TotaisMes
  saldoTotalCentavos: number
}

export function CartoesTotais({ totais, saldoTotalCentavos }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1 rounded-2xl bg-white p-5 shadow-sm">
          <span className="text-xs text-slate-500">Entradas</span>
          <ValorAnimado centavos={totais.entradas} className="text-lg text-emerald-600" />
        </div>
        <div className="flex flex-col gap-1 rounded-2xl bg-white p-5 shadow-sm">
          <span className="text-xs text-slate-500">Saídas</span>
          <ValorAnimado centavos={totais.saidas} className="text-lg text-red-600" />
        </div>
      </div>

      <div className="flex flex-col gap-1 rounded-2xl bg-white p-5 shadow-sm">
        <span className="text-xs text-slate-500">Saldo do mês</span>
        <ValorAnimado
          centavos={totais.saldo}
          className={`text-3xl font-medium ${totais.saldo < 0 ? 'text-red-600' : 'text-slate-900'}`}
        />
        <span className="mt-2 text-xs text-slate-400">
          Saldo total: <ValorAnimado centavos={saldoTotalCentavos} />
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verificar**

Run: `npm run typecheck`
Expected: passa.

- [ ] **Step 4: Commit**

```bash
git add components/SeletorMes.tsx components/CartoesTotais.tsx
git commit -m "feat: adiciona seletor de mês e cartões de total"
```

---

### Task 19: Extrato do mês

**Files:**
- Create: `components/Extrato.tsx`

Agrupado por dia, do mais recente para o mais antigo (spec §6), com entrada
escalonada (spec §8).

- [ ] **Step 1: Escrever o componente**

```tsx
'use client'

import { motion } from 'framer-motion'
import { formatCentavos } from '@/lib/dinheiro'
import type { Categoria, Lancamento } from '@/lib/tipos'

type Props = {
  lancamentos: Lancamento[]
  categorias: Categoria[]
  onEditar: (lancamento: Lancamento) => void
}

function agruparPorDia(lancamentos: Lancamento[]): [string, Lancamento[]][] {
  const grupos = new Map<string, Lancamento[]>()
  for (const l of lancamentos) {
    const lista = grupos.get(l.data) ?? []
    lista.push(l)
    grupos.set(l.data, lista)
  }
  // Mais recente primeiro.
  return [...grupos.entries()].sort((a, b) => b[0].localeCompare(a[0]))
}

function rotuloDia(data: string): string {
  const [, mes, dia] = data.split('-')
  return `${dia}/${mes}`
}

export function Extrato({ lancamentos, categorias, onEditar }: Props) {
  if (lancamentos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-10 text-center shadow-sm">
        <p className="text-sm text-slate-500">Nenhum lançamento neste mês.</p>
        <p className="text-xs text-slate-400">Toque no + para registrar o primeiro.</p>
      </div>
    )
  }

  const nomeCategoria = (id: string | null) =>
    categorias.find((c) => c.id === id)?.nome ?? 'Sem categoria'

  let indice = 0

  return (
    <div className="flex flex-col gap-6">
      {agruparPorDia(lancamentos).map(([data, doDia]) => (
        <div key={data} className="flex flex-col gap-2">
          <span className="px-1 text-xs text-slate-400">{rotuloDia(data)}</span>
          <div className="flex flex-col gap-2">
            {doDia.map((l) => (
              <motion.button
                key={l.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(indice++ * 0.03, 0.4) }}
                onClick={() => onEditar(l)}
                className="flex items-center justify-between rounded-2xl bg-white p-4 text-left shadow-sm"
              >
                <span className="flex flex-col">
                  <span className="text-sm">{l.descricao || '(sem descrição)'}</span>
                  <span className="text-xs text-slate-400">
                    {l.tipo === 'entrada' ? l.origem : nomeCategoria(l.categoriaId)}
                  </span>
                </span>
                <span
                  className={`text-sm tabular-nums ${
                    l.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {l.tipo === 'entrada' ? '+' : '−'} {formatCentavos(l.valorCentavos)}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verificar**

Run: `npm run typecheck`
Expected: passa.

- [ ] **Step 3: Commit**

```bash
git add components/Extrato.tsx
git commit -m "feat: exibe extrato do mês agrupado por dia"
```

---

### Task 20: Montar o dashboard

**Files:**
- Create: `app/page.tsx` (substitui o gerado pelo create-next-app)
- Create: `components/Navegacao.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Definir o fundo e a fonte**

Em `app/globals.css`: **apague a regra `body` e o bloco
`@media (prefers-color-scheme: dark)` que o scaffold gerou** e ponha, no fim do
arquivo:

```css
body {
  background-color: #f5f5f4;
  color: #0f172a;
}

/* Sem isso o count-up faz o número tremer: cada dígito tem largura diferente. */
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 2: Escrever a navegação**

`components/Navegacao.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITENS = [
  { href: '/', rotulo: 'Resumo' },
  { href: '/fixos', rotulo: 'Fixos' },
  { href: '/ajustes', rotulo: 'Ajustes' },
]

export function Navegacao() {
  const atual = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center border-t border-slate-200 bg-white/90 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:backdrop-blur-none">
      <div className="flex w-full max-w-md justify-around p-2 sm:justify-start sm:gap-2 sm:p-0">
        {ITENS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-xl px-4 py-2 text-sm transition-colors ${
              atual === item.href ? 'bg-slate-900 text-white' : 'text-slate-500'
            }`}
          >
            {item.rotulo}
          </Link>
        ))}
      </div>
    </nav>
  )
}
```

- [ ] **Step 3: Ajustar o layout**

`app/layout.tsx` — mantenha os imports de fonte **que o scaffold gerou** (no Next
16 são `Geist` e `Geist_Mono`, não `Inter`) e troque só o conteúdo do `<body>`:

```tsx
<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
  <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 p-4 pb-24 sm:max-w-2xl sm:gap-6 sm:p-8 sm:pb-8">
    {children}
  </div>
</body>
```

Troque também o `metadata.title` para `'Studio'`.

Se o seu scaffold tiver gerado outra fonte, use as variáveis que ele criou — não
copie `geistSans` às cegas, ou o build falha com `Cannot find name`.

A `Navegacao` fica dentro de cada página, não do layout, porque a tela `/entrar`
não deve mostrá-la.

- [ ] **Step 4: Escrever o dashboard**

`app/page.tsx`:

```tsx
'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { CartoesTotais } from '@/components/CartoesTotais'
import { Extrato } from '@/components/Extrato'
import { ModalLancamento } from '@/components/ModalLancamento'
import { Navegacao } from '@/components/Navegacao'
import { SeletorMes } from '@/components/SeletorMes'
import { competenciaAtual } from '@/lib/competencia'
import type { Categoria, Lancamento } from '@/lib/tipos'
import type { TotalCategoria, TotaisMes } from '@/lib/totais'

type DadosMes = {
  competencia: string
  lancamentos: Lancamento[]
  totais: TotaisMes
  saldoTotalCentavos: number
  porCategoria: TotalCategoria[]
  categorias: Categoria[]
}

export default function Dashboard() {
  const [competencia, setCompetencia] = useState(competenciaAtual())
  const [direcao, setDirecao] = useState<1 | -1>(1)
  const [dados, setDados] = useState<DadosMes | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Lancamento | null>(null)
  // Incrementa a cada abertura. Ver a explicação na key do ModalLancamento.
  const [aberturas, setAberturas] = useState(0)

  const carregar = useCallback(async () => {
    setErro(null)
    try {
      const resposta = await fetch(`/api/mes?competencia=${competencia}`)
      if (!resposta.ok) throw new Error('resposta não ok')
      setDados((await resposta.json()) as DadosMes)
    } catch {
      // Spec §10: nunca tela branca. O que já estava carregado continua na tela.
      setErro('Não foi possível carregar. Verifique a conexão.')
    }
  }, [competencia])

  useEffect(() => {
    void carregar()
  }, [carregar])

  function mudarMes(nova: string, dir: 1 | -1) {
    setDirecao(dir)
    setCompetencia(nova)
  }

  function abrirNovo() {
    setEditando(null)
    setAberturas((n) => n + 1)
    setModalAberto(true)
  }

  function abrirEdicao(lancamento: Lancamento) {
    setEditando(lancamento)
    setAberturas((n) => n + 1)
    setModalAberto(true)
  }

  return (
    <>
      <Navegacao />

      <SeletorMes competencia={competencia} onMudar={mudarMes} />

      {erro && (
        <div className="flex items-center justify-between rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
          <span>{erro}</span>
          <button onClick={() => void carregar()} className="underline">
            Tentar de novo
          </button>
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={competencia}
          initial={{ opacity: 0, x: direcao * 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direcao * -24 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="flex flex-col gap-6"
        >
          {dados && (
            <>
              <CartoesTotais
                totais={dados.totais}
                saldoTotalCentavos={dados.saldoTotalCentavos}
              />
              <Extrato
                lancamentos={dados.lancamentos}
                categorias={dados.categorias}
                onEditar={abrirEdicao}
              />
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <button
        onClick={abrirNovo}
        aria-label="Novo lançamento"
        className="fixed bottom-20 right-6 z-40 h-14 w-14 rounded-full bg-slate-900 text-2xl text-white shadow-lg transition-transform active:scale-95 sm:bottom-8"
      >
        +
      </button>

      <ModalLancamento
        // A key remonta o modal a cada ABERTURA, não só a cada alvo diferente.
        // Só o id não bastaria: duas criações seguidas compartilhariam a key
        // 'novo', o componente não desmontaria, e a segunda abriria com o que
        // foi digitado na primeira (ver Task 16).
        key={`${editando?.id ?? 'novo'}-${aberturas}`}
        aberto={modalAberto}
        categorias={dados?.categorias ?? []}
        lancamento={editando}
        onFechar={() => setModalAberto(false)}
        onSalvo={() => void carregar()}
      />
    </>
  )
}
```

- [ ] **Step 5: Verificar na prática**

```bash
npm run dev
```

Percorra, nesta ordem:

1. Criar uma entrada de R$ 500,00 hoje → aparece no extrato em verde com `+`.
2. Criar uma saída de R$ 98,00 na categoria "Contas fixas" → aparece em vermelho.
3. Os três totais batem: entradas 500,00, saídas 98,00, saldo 402,00.
4. Clicar na entrada abre o modal preenchido; mudar o valor para 600,00 e salvar
   atualiza o total sem recarregar a página.
5. Navegar para o mês anterior mostra zeros e o extrato vazio; voltar mostra os
   lançamentos de novo.
6. Excluir um lançamento atualiza os totais.
7. Desligar o Wi-Fi e navegar de mês mostra a faixa âmbar de erro, **sem** apagar
   o que já estava na tela.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx app/layout.tsx app/globals.css components/Navegacao.tsx
git commit -m "feat: monta dashboard com totais, extrato e navegação por mês"
```

---

## Chunk 5: Gastos fixos e fila de pendências

Implementa a prioridade 3 da spec original e a regra da spec §5.

### Task 21: API de gastos fixos

**Files:**
- Modify: `lib/mapeamento.ts`
- Create: `app/api/gastos-fixos/route.ts`
- Create: `app/api/gastos-fixos/[id]/route.ts`

- [ ] **Step 1: Adicionar o mapeamento do gasto fixo**

Acrescente ao fim de `lib/mapeamento.ts`:

```ts
import type { GastoFixo } from './tipos'

export type LinhaGastoFixo = {
  id: string
  nome: string
  valor_referencia_centavos: number
  categoria_id: string
  arquivada: boolean
  competencia_inicial: string
}

export function paraGastoFixo(linha: LinhaGastoFixo): GastoFixo {
  return {
    id: linha.id,
    nome: linha.nome,
    valorReferenciaCentavos: linha.valor_referencia_centavos,
    categoriaId: linha.categoria_id,
    arquivada: linha.arquivada,
    competenciaInicial: linha.competencia_inicial,
  }
}
```

> **Por que aqui e não no `route.ts`.** Um `route.ts` do App Router só pode
> exportar handlers HTTP e um punhado de opções de config. Qualquer outro export
> de valor faz o `next build` falhar na checagem de tipos gerada — e, pior, o
> `tsc --noEmit` **passa** numa árvore limpa, então o erro só apareceria lá na
> Task 30. Helper compartilhado entre rotas mora em `lib/`.

- [ ] **Step 2: Escrever listagem e criação**

`app/api/gastos-fixos/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { competenciaAtual } from '@/lib/competencia'
import { paraGastoFixo, type LinhaGastoFixo } from '@/lib/mapeamento'
import { clienteServidor } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await clienteServidor()
    .from('gastos_fixos')
    .select('*')
    .eq('arquivada', false)
    .order('nome')

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json((data as LinhaGastoFixo[]).map(paraGastoFixo))
}

export async function POST(request: Request) {
  const corpo = (await request.json()) as Record<string, unknown>

  if (typeof corpo.nome !== 'string' || corpo.nome.trim() === '') {
    return NextResponse.json({ erro: 'Informe o nome.' }, { status: 400 })
  }
  if (!Number.isInteger(corpo.valorReferenciaCentavos) || (corpo.valorReferenciaCentavos as number) <= 0) {
    return NextResponse.json({ erro: 'Valor precisa ser maior que zero.' }, { status: 400 })
  }
  if (typeof corpo.categoriaId !== 'string') {
    return NextResponse.json({ erro: 'Escolha uma categoria.' }, { status: 400 })
  }

  const { data, error } = await clienteServidor()
    .from('gastos_fixos')
    .insert({
      nome: corpo.nome.trim(),
      valor_referencia_centavos: corpo.valorReferenciaCentavos,
      categoria_id: corpo.categoriaId,
      // Spec §5: passa a gerar pendência a partir deste mês, nunca retroativo.
      // Calculado no servidor com o fuso do usuário, não pelo relógio do banco.
      competencia_inicial: competenciaAtual(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json(paraGastoFixo(data as LinhaGastoFixo), { status: 201 })
}
```

- [ ] **Step 3: Escrever edição e remoção**

`app/api/gastos-fixos/[id]/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { clienteServidor } from '@/lib/supabase'

type Contexto = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Contexto) {
  const { id } = await params
  const corpo = (await request.json()) as Record<string, unknown>

  const mudancas: Record<string, unknown> = {}
  if (typeof corpo.nome === 'string' && corpo.nome.trim() !== '') {
    mudancas.nome = corpo.nome.trim()
  }
  if (Number.isInteger(corpo.valorReferenciaCentavos) && (corpo.valorReferenciaCentavos as number) > 0) {
    mudancas.valor_referencia_centavos = corpo.valorReferenciaCentavos
  }
  if (typeof corpo.categoriaId === 'string') {
    mudancas.categoria_id = corpo.categoriaId
  }

  if (Object.keys(mudancas).length === 0) {
    return NextResponse.json({ erro: 'Nada para alterar.' }, { status: 400 })
  }

  const { error } = await clienteServidor().from('gastos_fixos').update(mudancas).eq('id', id)
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}

export async function DELETE(_request: Request, { params }: Contexto) {
  const { id } = await params

  // Spec §4: "remover" é arquivar. Apagar de verdade derrubaria, por cascade,
  // o controle de idempotência e reabriria meses já quitados.
  const { error } = await clienteServidor()
    .from('gastos_fixos')
    .update({ arquivada: true })
    .eq('id', id)

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 4: Verificar**

Run: `npm run typecheck`
Expected: passa.

- [ ] **Step 5: Commit**

```bash
git add lib/mapeamento.ts app/api/gastos-fixos
git commit -m "feat: gerencia gastos fixos via API"
```

---

### Task 22: API da fila de pendências

**Files:**
- Create: `app/api/pendencias/route.ts`

O `POST` grava o lançamento **e** a linha de controle. Se a linha de controle
falhar (outro dispositivo lançou o mesmo gasto no mesmo instante), o lançamento
precisa ser desfeito — senão sobra uma despesa duplicada sem controle.

- [ ] **Step 1: Escrever o handler**

```ts
import { NextResponse } from 'next/server'
import { competenciaAtual, competenciaDe } from '@/lib/competencia'
import { gastosPendentes } from '@/lib/pendencias'
import { clienteServidor } from '@/lib/supabase'
import { paraGastoFixo } from '@/lib/mapeamento'
import type { GastoFixo, GastoFixoLancado } from '@/lib/tipos'

async function carregarPendentes(competencia: string): Promise<GastoFixo[]> {
  const supabase = clienteServidor()

  const [fixosRes, lancadosRes] = await Promise.all([
    supabase.from('gastos_fixos').select('*').order('nome'),
    supabase.from('gastos_fixos_lancados').select('*').eq('competencia', competencia),
  ])

  if (fixosRes.error) throw new Error(fixosRes.error.message)
  if (lancadosRes.error) throw new Error(lancadosRes.error.message)

  const fixos = fixosRes.data.map(paraGastoFixo)
  const lancados: GastoFixoLancado[] = lancadosRes.data.map((l) => ({
    gastoFixoId: l.gasto_fixo_id,
    competencia: l.competencia,
    lancamentoId: l.lancamento_id,
  }))

  return gastosPendentes(fixos, lancados, competencia)
}

export async function GET() {
  const competencia = competenciaAtual()
  try {
    return NextResponse.json({ competencia, pendentes: await carregarPendentes(competencia) })
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 })
  }
}

type ItemConfirmado = {
  gastoFixoId: string
  valorCentavos: number
  data: string
}

export async function POST(request: Request) {
  let itens: ItemConfirmado[] | undefined
  try {
    itens = ((await request.json()) as { itens?: ItemConfirmado[] }).itens
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  if (!Array.isArray(itens) || itens.length === 0) {
    return NextResponse.json({ erro: 'Nada para lançar.' }, { status: 400 })
  }

  const supabase = clienteServidor()
  const competencia = competenciaAtual()
  const falhas: string[] = []

  for (const item of itens) {
    if (!Number.isInteger(item.valorCentavos) || item.valorCentavos <= 0) {
      falhas.push(`Valor inválido em ${item.gastoFixoId}.`)
      continue
    }
    if (competenciaDe(item.data) !== competencia) {
      falhas.push('A data precisa estar dentro do mês corrente.')
      continue
    }

    const { data: fixo } = await supabase
      .from('gastos_fixos')
      .select('nome, categoria_id')
      .eq('id', item.gastoFixoId)
      .single()

    if (!fixo) {
      falhas.push(`Gasto fixo ${item.gastoFixoId} não encontrado.`)
      continue
    }

    const { data: lancamento, error: erroLancamento } = await supabase
      .from('lancamentos')
      .insert({
        tipo: 'saida',
        data: item.data,
        valor_centavos: item.valorCentavos,
        descricao: fixo.nome,
        categoria_id: fixo.categoria_id,
      })
      .select('id')
      .single()

    if (erroLancamento || !lancamento) {
      falhas.push(`Não foi possível lançar ${fixo.nome}.`)
      continue
    }

    const { error: erroControle } = await supabase.from('gastos_fixos_lancados').insert({
      gasto_fixo_id: item.gastoFixoId,
      competencia,
      lancamento_id: lancamento.id,
    })

    if (erroControle) {
      // A chave única barrou: outro dispositivo já lançou este gasto neste mês.
      // Desfaz o lançamento para não deixar despesa duplicada e sem controle.
      await supabase.from('lancamentos').delete().eq('id', lancamento.id)
      falhas.push(`${fixo.nome} já havia sido lançado neste mês.`)
    }
  }

  return NextResponse.json({
    ok: falhas.length === 0,
    falhas,
    pendentes: await carregarPendentes(competencia),
  })
}
```

> **Sobre o laço sequencial:** são no máximo uns poucos itens por mês. Paralelizar
> com `Promise.all` complicaria o desfazimento sem ganho perceptível.

- [ ] **Step 2: Verificar**

Run: `npm run typecheck`
Expected: passa.

- [ ] **Step 3: Commit**

```bash
git add app/api/pendencias/route.ts
git commit -m "feat: confirma lançamento dos gastos fixos do mês"
```

---

### Task 23: Card de pendências no dashboard

**Files:**
- Create: `components/CardPendencias.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Escrever o card**

`components/CardPendencias.tsx`:

```tsx
'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { hojeEmSaoPaulo, rotuloCompetencia } from '@/lib/competencia'
import { formatCentavos, parseValorBRL } from '@/lib/dinheiro'
import type { GastoFixo } from '@/lib/tipos'

type Props = {
  pendentes: GastoFixo[]
  competencia: string
  /** Recebe as falhas para exibir FORA do card, que remonta ao lançar. */
  onLancado: (falhas: string[]) => void
}

export function CardPendencias({ pendentes, competencia, onLancado }: Props) {
  const [aberto, setAberto] = useState(false)
  const [marcados, setMarcados] = useState<Set<string>>(new Set(pendentes.map((p) => p.id)))
  const [valores, setValores] = useState<Record<string, string>>(
    Object.fromEntries(
      pendentes.map((p) => [p.id, formatCentavos(p.valorReferenciaCentavos).replace('R$', '').trim()]),
    ),
  )
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (pendentes.length === 0) return null

  function alternar(id: string) {
    const novo = new Set(marcados)
    if (novo.has(id)) novo.delete(id)
    else novo.add(id)
    setMarcados(novo)
  }

  async function confirmar() {
    const itens = []
    for (const p of pendentes) {
      if (!marcados.has(p.id)) continue
      const centavos = parseValorBRL(valores[p.id] ?? '')
      if (centavos === null) {
        setErro(`Valor inválido em ${p.nome}.`)
        return
      }
      itens.push({ gastoFixoId: p.id, valorCentavos: centavos, data: hojeEmSaoPaulo() })
    }

    if (itens.length === 0) {
      setAberto(false)
      return
    }

    setEnviando(true)
    setErro(null)

    const resposta = await fetch('/api/pendencias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itens }),
    })

    setEnviando(false)

    const corpo = (await resposta.json()) as { ok?: boolean; falhas?: string[] }

    // As falhas sobem para o pai: este card é remontado assim que a lista de
    // pendentes muda (ver a key na Task 23, Step 2), e um setErro local seria
    // apagado justamente no caso de sucesso parcial, que é quando ele importa.
    onLancado(corpo.falhas?.length ? corpo.falhas : resposta.ok ? [] : ['Não foi possível lançar.'])
    if (corpo.ok) setAberto(false)
  }

  return (
    <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-sm">
      <button onClick={() => setAberto(!aberto)} className="flex w-full items-center justify-between text-left">
        <span className="text-sm">
          {pendentes.length === 1
            ? `1 gasto fixo de ${rotuloCompetencia(competencia)} ainda não lançado`
            : `${pendentes.length} gastos fixos de ${rotuloCompetencia(competencia)} ainda não lançados`}
        </span>
        <span className="text-slate-400">{aberto ? '−' : '+'}</span>
      </button>

      <AnimatePresence initial={false}>
        {aberto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="mt-4 flex flex-col gap-3"
          >
            {pendentes.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={marcados.has(p.id)}
                  onChange={() => alternar(p.id)}
                  className="h-4 w-4"
                />
                <span className="flex-1 text-sm">{p.nome}</span>
                <input
                  inputMode="decimal"
                  value={valores[p.id] ?? ''}
                  onChange={(e) => setValores({ ...valores, [p.id]: e.target.value })}
                  className="w-28 rounded-lg bg-white/10 px-3 py-2 text-right text-sm tabular-nums outline-none"
                />
              </div>
            ))}

            {erro && <p className="text-xs text-amber-300">{erro}</p>}

            <button
              onClick={confirmar}
              disabled={enviando}
              className="mt-1 rounded-xl bg-white py-3 text-sm text-slate-900 disabled:opacity-40"
            >
              {enviando ? 'Lançando…' : 'Lançar selecionados'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 2: Ligar o card ao dashboard**

Em `app/page.tsx`:

1. Adicione o import de `CardPendencias` e de `GastoFixo`.
2. Adicione o estado e o carregamento:

```tsx
const [pendentes, setPendentes] = useState<GastoFixo[]>([])

const carregarPendencias = useCallback(async () => {
  try {
    const resposta = await fetch('/api/pendencias')
    if (!resposta.ok) return
    const corpo = (await resposta.json()) as { pendentes: GastoFixo[] }
    setPendentes(corpo.pendentes)
  } catch {
    // Silencioso de propósito: a fila é um extra, não pode derrubar o dashboard.
  }
}, [])

useEffect(() => {
  void carregarPendencias()
}, [carregarPendencias])
```

3. Adicione o estado das falhas, que precisa viver no pai:

```tsx
const [falhasPendencias, setFalhasPendencias] = useState<string[]>([])
```

4. Renderize logo acima do `SeletorMes`, **só quando o mês exibido é o corrente**
   (spec §6):

```tsx
{competencia === competenciaAtual() && (
  <>
    <CardPendencias
      key={pendentes.map((p) => p.id).join(',')}
      pendentes={pendentes}
      competencia={competencia}
      onLancado={(falhas) => {
        setFalhasPendencias(falhas)
        void carregar()
        void carregarPendencias()
      }}
    />
    {falhasPendencias.length > 0 && (
      <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
        {falhasPendencias.map((f) => (
          <p key={f}>{f}</p>
        ))}
      </div>
    )}
  </>
)}
```

A `key` remonta o card quando a lista muda, resetando os checkboxes e os valores
digitados — pelo mesmo motivo do modal na Task 16.

- [ ] **Step 3: Verificar na prática**

```bash
npm run dev
```

1. O dashboard mostra "2 gastos fixos de \<mês> ainda não lançados".
2. Abrir mostra Internet com 98,00 e PriceLabs com 110,00, ambos marcados.
3. Alterar o PriceLabs para 115,50, desmarcar a Internet e confirmar → só o
   PriceLabs vira saída, com o valor alterado.
4. O card passa a mostrar "1 gasto fixo…".
5. Navegar para o mês anterior **esconde** o card.
6. Excluir no extrato a saída do PriceLabs e recarregar → o card volta a mostrar
   2 pendências (o cascade devolveu o gasto para a fila).
7. Abrir o app em duas abas, lançar a Internet numa e depois lançar as duas na
   outra → a aba lenta mostra a faixa âmbar "Internet já havia sido lançado
   neste mês" e o PriceLabs entra normalmente. A mensagem tem que **permanecer**
   na tela depois que o card se recolhe.

O passo 6 é o teste mais importante do chunk: ele prova que o `ON DELETE CASCADE`
da Task 8 está funcionando.

- [ ] **Step 4: Commit**

```bash
git add components/CardPendencias.tsx app/page.tsx
git commit -m "feat: sugere lançamento dos gastos fixos no início do mês"
```

---

### Task 24: Tela de gastos fixos

**Files:**
- Create: `app/fixos/page.tsx`

- [ ] **Step 1: Escrever a tela**

```tsx
'use client'

import { motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { CampoValor } from '@/components/CampoValor'
import { Navegacao } from '@/components/Navegacao'
import { formatCentavos } from '@/lib/dinheiro'
import type { Categoria, GastoFixo } from '@/lib/tipos'

export default function Fixos() {
  const [fixos, setFixos] = useState<GastoFixo[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [pendentesIds, setPendentesIds] = useState<Set<string>>(new Set())
  const [editando, setEditando] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [valorCentavos, setValorCentavos] = useState<number | null>(null)
  const [categoriaId, setCategoriaId] = useState('')

  const carregar = useCallback(async () => {
    setErro(null)
    try {
      const [fixosRes, mesRes, pendRes] = await Promise.all([
        fetch('/api/gastos-fixos'),
        fetch('/api/mes'),
        fetch('/api/pendencias'),
      ])
      if (!fixosRes.ok || !mesRes.ok) throw new Error('falhou')
      setFixos((await fixosRes.json()) as GastoFixo[])
      setCategorias(((await mesRes.json()) as { categorias: Categoria[] }).categorias)

      // Quem não está pendente já foi lançado neste mês (spec §6).
      if (pendRes.ok) {
        const { pendentes } = (await pendRes.json()) as { pendentes: GastoFixo[] }
        setPendentesIds(new Set(pendentes.map((p) => p.id)))
      }
    } catch {
      setErro('Não foi possível carregar.')
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function adicionar() {
    if (nome.trim() === '' || valorCentavos === null || categoriaId === '') {
      setErro('Preencha nome, valor e categoria.')
      return
    }
    const resposta = await fetch('/api/gastos-fixos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, valorReferenciaCentavos: valorCentavos, categoriaId }),
    })
    if (!resposta.ok) {
      setErro('Não foi possível adicionar.')
      return
    }
    setNome('')
    setValorCentavos(null)
    setCategoriaId('')
    void carregar()
  }

  async function remover(id: string, nomeDoFixo: string) {
    if (!confirm(`Remover "${nomeDoFixo}"? Os lançamentos já feitos continuam no histórico.`)) {
      return
    }
    await fetch(`/api/gastos-fixos/${id}`, { method: 'DELETE' })
    void carregar()
  }

  async function salvarValor(id: string, centavos: number | null) {
    setEditando(null)
    if (centavos === null) return
    await fetch(`/api/gastos-fixos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valorReferenciaCentavos: centavos }),
    })
    void carregar()
  }

  const nomeCategoria = (id: string) => categorias.find((c) => c.id === id)?.nome ?? '—'

  return (
    <>
      <Navegacao />
      <h1 className="text-lg font-medium">Gastos fixos</h1>

      {erro && <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{erro}</p>}

      <div className="flex flex-col gap-2">
        {fixos.map((f, i) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
            className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
          >
            <span className="flex flex-col">
              <span className="text-sm">{f.nome}</span>
              <span className="text-xs text-slate-400">
                {nomeCategoria(f.categoriaId)} ·{' '}
                {pendentesIds.has(f.id) ? (
                  <span className="text-amber-600">pendente neste mês</span>
                ) : (
                  <span className="text-emerald-600">lançado neste mês</span>
                )}
              </span>
            </span>
            <span className="flex items-center gap-4">
              {editando === f.id ? (
                <span className="w-32">
                  <CampoValor
                    autoFocus
                    valorCentavos={f.valorReferenciaCentavos}
                    onChange={(c) => void salvarValor(f.id, c)}
                  />
                </span>
              ) : (
                <button
                  onClick={() => setEditando(f.id)}
                  aria-label={`Editar valor de ${f.nome}`}
                  className="text-sm tabular-nums text-slate-600 underline decoration-slate-200 underline-offset-4"
                >
                  {formatCentavos(f.valorReferenciaCentavos)}
                </button>
              )}
              <button
                onClick={() => void remover(f.id, f.nome)}
                aria-label={`Remover ${f.nome}`}
                className="text-slate-300 transition-colors hover:text-red-600"
              >
                ×
              </button>
            </span>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm">
        <span className="text-xs text-slate-500">Novo gasto fixo</span>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome (ex: Condomínio)"
          className="rounded-xl bg-slate-100 px-4 py-3 outline-none"
        />
        <CampoValor valorCentavos={valorCentavos} onChange={setValorCentavos} />
        <select
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          className="rounded-xl bg-slate-100 px-4 py-3 outline-none"
        >
          <option value="">Categoria…</option>
          {categorias.filter((c) => !c.arquivada).map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
        <button onClick={adicionar} className="rounded-xl bg-slate-900 py-3 text-white">
          Adicionar
        </button>
      </div>
    </>
  )
}
```

> **Escopo da edição.** Só o valor de referência é editável aqui, clicando no
> número. Nome e categoria não são — para trocá-los, remova e adicione de novo.
> O valor é o único que muda na prática, e é justamente o campo que alimenta a
> fila de pendências todo mês.

- [ ] **Step 2: Verificar na prática**

1. A tela lista Internet e PriceLabs com seus valores e o status do mês.
2. Se você já lançou um deles na Task 23, ele aparece como "lançado neste mês"
   em verde e o outro como "pendente neste mês" em âmbar.
3. Clicar no valor da Internet abre o campo; mudar para 105,00 e sair do campo
   salva — recarregue e confirme que ficou.
4. Adicionar "Condomínio" R$ 450,00 em "Contas fixas" → aparece na lista.
5. Voltar ao resumo → o card de pendências agora inclui o Condomínio.
6. Remover "Condomínio" → some da lista, e o card volta ao que era.

- [ ] **Step 3: Commit**

```bash
git add app/fixos/page.tsx
git commit -m "feat: adiciona tela de gastos fixos"
```

---

## Chunk 6: Categorias e import de CSV

Implementa a prioridade 4 da spec original e a spec §7.

### Task 25: API de categorias

**Files:**
- Create: `app/api/categorias/route.ts`
- Create: `app/api/categorias/[id]/route.ts`

- [ ] **Step 1: Escrever criação**

`app/api/categorias/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { clienteServidor } from '@/lib/supabase'

const CORES = ['#38bdf8', '#fb923c', '#a78bfa', '#34d399', '#f472b6', '#facc15']

export async function POST(request: Request) {
  const corpo = (await request.json()) as { nome?: unknown }

  if (typeof corpo.nome !== 'string' || corpo.nome.trim() === '') {
    return NextResponse.json({ erro: 'Informe o nome.' }, { status: 400 })
  }

  const supabase = clienteServidor()
  const { count } = await supabase.from('categorias').select('*', { count: 'exact', head: true })

  const { data, error } = await supabase
    .from('categorias')
    .insert({ nome: corpo.nome.trim(), cor: CORES[(count ?? 0) % CORES.length] })
    .select()
    .single()

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 2: Escrever arquivamento**

`app/api/categorias/[id]/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { clienteServidor } from '@/lib/supabase'

type Contexto = { params: Promise<{ id: string }> }

export async function DELETE(_request: Request, { params }: Contexto) {
  const { id } = await params

  // Spec §4: arquivar, não apagar. Apagar quebraria a FK dos lançamentos
  // antigos e deixaria o histórico sem classificação.
  const { error } = await clienteServidor()
    .from('categorias')
    .update({ arquivada: true })
    .eq('id', id)

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 3: Verificar**

Run: `npm run typecheck`
Expected: passa.

- [ ] **Step 4: Commit**

```bash
git add app/api/categorias
git commit -m "feat: cria e arquiva categorias"
```

---

### Task 26: API de import

**Files:**
- Create: `app/api/entradas/route.ts`
- Create: `app/api/importar/route.ts`

O endpoint recebe as linhas **já validadas e escolhidas** pelo preview. O parse
acontece no navegador, com as funções puras da Task 7 — o servidor só grava o
que foi confirmado.

- [ ] **Step 1: Escrever o endpoint de entradas existentes**

`app/api/entradas/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { clienteServidor } from '@/lib/supabase'

/**
 * Todas as entradas já gravadas, com o mínimo que a detecção de duplicados
 * precisa. Não dá para usar /api/mes aqui: ele devolve só o mês corrente, e o
 * histórico a importar é de 2025 — a comparação nunca encontraria nada.
 */
export async function GET() {
  const { data, error } = await clienteServidor()
    .from('lancamentos')
    .select('data, valor_centavos')
    .eq('tipo', 'entrada')

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  return NextResponse.json(
    data.map((l) => ({
      tipo: 'entrada' as const,
      data: l.data as string,
      valorCentavos: l.valor_centavos as number,
    })),
  )
}
```

- [ ] **Step 2: Escrever o handler de import**

```ts
import { NextResponse } from 'next/server'
import { clienteServidor } from '@/lib/supabase'

type LinhaParaGravar = {
  data: string
  valorCentavos: number
  descricao: string
  noites: number | null
  hospedes: number | null
}

export async function POST(request: Request) {
  const { linhas } = (await request.json()) as { linhas?: LinhaParaGravar[] }

  if (!Array.isArray(linhas) || linhas.length === 0) {
    return NextResponse.json({ erro: 'Nada para importar.' }, { status: 400 })
  }

  const positivoOuNulo = (v: number | null) => v === null || (Number.isInteger(v) && v > 0)

  const invalida = linhas.find(
    (l) =>
      !/^\d{4}-\d{2}-\d{2}$/.test(l.data) ||
      !Number.isInteger(l.valorCentavos) ||
      l.valorCentavos <= 0 ||
      !positivoOuNulo(l.noites) ||
      !positivoOuNulo(l.hospedes),
  )
  if (invalida) {
    return NextResponse.json(
      { erro: 'O arquivo contém linha inválida. Revise o preview.' },
      { status: 400 },
    )
  }

  // Spec §7: import é só de entradas, todas com origem Airbnb.
  const { data, error } = await clienteServidor()
    .from('lancamentos')
    .insert(
      linhas.map((l) => ({
        tipo: 'entrada',
        data: l.data,
        valor_centavos: l.valorCentavos,
        descricao: l.descricao,
        origem: 'Airbnb',
        noites: l.noites,
        hospedes: l.hospedes,
      })),
    )
    .select()

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  return NextResponse.json({ importadas: data.length })
}
```

- [ ] **Step 3: Verificar**

Run: `npm run typecheck`
Expected: passa.

- [ ] **Step 4: Commit**

```bash
git add app/api/entradas/route.ts app/api/importar/route.ts
git commit -m "feat: grava entradas importadas do CSV"
```

---

### Task 27: Tela de ajustes com import

**Files:**
- Create: `app/ajustes/page.tsx`
- Create: `components/ImportarCsv.tsx`

**Encoding (spec §7):** a leitura do arquivo tenta UTF-8 primeiro e cai para
Latin-1 se aparecer o caractere de substituição `�`. É onde o fallback de
encoding vive — o parser da Task 7 recebe texto já decodificado.

- [ ] **Step 1: Escrever o componente de import**

`components/ImportarCsv.tsx`:

```tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { formatCentavos } from '@/lib/dinheiro'
import {
  marcarDuplicados,
  parseCsvEntradas,
  type LancamentoExistente,
  type LinhaImportMarcada,
} from '@/lib/csv'

/**
 * Decodifica tentando UTF-8 e caindo para windows-1252 (o "Latin-1" que o Excel
 * brasileiro de fato produz) quando aparece caractere de substituição.
 */
async function lerTexto(arquivo: File): Promise<string> {
  const bytes = await arquivo.arrayBuffer()
  const utf8 = new TextDecoder('utf-8').decode(bytes)
  if (!utf8.includes('�')) return utf8
  return new TextDecoder('windows-1252').decode(bytes)
}

export function ImportarCsv({ onImportado }: { onImportado: () => void }) {
  const [linhas, setLinhas] = useState<LinhaImportMarcada[]>([])
  const [escolhidas, setEscolhidas] = useState<Set<number>>(new Set())
  const [erro, setErro] = useState<string | null>(null)
  const [resultado, setResultado] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [texto, setTexto] = useState('')
  const existentes = useRef<LancamentoExistente[]>([])

  // Busca as entradas já gravadas UMA vez, não a cada tecla digitada.
  useEffect(() => {
    void (async () => {
      const resposta = await fetch('/api/entradas')
      if (resposta.ok) existentes.current = (await resposta.json()) as LancamentoExistente[]
    })()
  }, [])

  const preparar = useCallback((conteudo: string) => {
    setErro(null)
    setResultado(null)

    if (conteudo.trim() === '') {
      setLinhas([])
      setEscolhidas(new Set())
      return
    }

    try {
      const marcadas = marcarDuplicados(parseCsvEntradas(conteudo), existentes.current)
      setLinhas(marcadas)
      // Duplicadas e linhas com erro vêm desmarcadas (spec §7).
      setEscolhidas(
        new Set(marcadas.filter((l) => l.erro === null && !l.duplicada).map((l) => l.linha)),
      )
    } catch (e) {
      setLinhas([])
      setEscolhidas(new Set())
      setErro((e as Error).message)
    }
  }, [])

  // Analisa 400ms depois da última tecla. Sem isso, o preview reclamaria de
  // "cabeçalho inválido" já na primeira letra digitada, e cada tecla jogaria
  // fora os checkboxes que o usuário tivesse marcado.
  useEffect(() => {
    const id = setTimeout(() => preparar(texto), 400)
    return () => clearTimeout(id)
  }, [texto, preparar])

  async function importar() {
    const paraGravar = linhas
      .filter((l) => escolhidas.has(l.linha) && l.erro === null)
      .map((l) => ({
        data: l.data as string,
        valorCentavos: l.valorCentavos as number,
        descricao: l.descricao,
        noites: l.noites,
        hospedes: l.hospedes,
      }))

    if (paraGravar.length === 0) {
      setErro('Nenhuma linha selecionada.')
      return
    }

    setEnviando(true)
    const resposta = await fetch('/api/importar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linhas: paraGravar }),
    })
    setEnviando(false)

    if (!resposta.ok) {
      const c = (await resposta.json()) as { erro?: string }
      setErro(c.erro ?? 'Não foi possível importar.')
      return
    }

    const { importadas } = (await resposta.json()) as { importadas: number }
    setResultado(`${importadas} ${importadas === 1 ? 'entrada importada' : 'entradas importadas'}.`)
    setTexto('')
    setLinhas([])
    setEscolhidas(new Set())

    // Recarrega a base de comparação: o que acabou de entrar passa a contar
    // como duplicata num import seguinte.
    const atualizadas = await fetch('/api/entradas')
    if (atualizadas.ok) existentes.current = (await atualizadas.json()) as LancamentoExistente[]

    onImportado()
  }

  const validas = linhas.filter((l) => l.erro === null).length
  const comErro = linhas.length - validas
  const duplicadas = linhas.filter((l) => l.duplicada).length

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm">
      <span className="text-xs text-slate-500">Importar reservas (CSV)</span>
      <p className="text-xs text-slate-400">
        Colunas: data, valor, descricao (opcionalmente noites e hospedes). Aceita
        separador <code>;</code> ou <code>,</code>, datas 31/12/2025 ou 2025-12-31,
        valores 1.234,56 ou 1234.56. Todas as linhas viram entradas com origem Airbnb.
      </p>

      <input
        type="file"
        accept=".csv,text/csv,text/plain"
        onChange={async (e) => {
          const arquivo = e.target.files?.[0]
          if (arquivo) setTexto(await lerTexto(arquivo))
          // Reseta o input: sem isso, escolher o mesmo arquivo de novo depois
          // de importar não dispara onChange nenhum.
          e.target.value = ''
        }}
        className="text-sm"
      />

      <textarea
        placeholder="…ou cole o conteúdo aqui"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={4}
        className="rounded-xl bg-slate-100 p-3 font-mono text-xs outline-none"
      />

      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {resultado && <p className="text-sm text-emerald-700">{resultado}</p>}

      {linhas.length > 0 && (
        <>
          <p className="text-xs text-slate-500">
            {validas} {validas === 1 ? 'linha válida' : 'linhas válidas'}
            {comErro > 0 && `, ${comErro} com erro`}
            {duplicadas > 0 && `, ${duplicadas} provável duplicada`}
          </p>

          <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-100">
            {linhas.map((l) => (
              <label
                key={l.linha}
                className={`flex items-center gap-3 border-b border-slate-50 p-3 text-xs last:border-0 ${
                  l.erro ? 'bg-red-50' : l.duplicada ? 'bg-amber-50' : ''
                }`}
              >
                <input
                  type="checkbox"
                  disabled={l.erro !== null}
                  checked={escolhidas.has(l.linha)}
                  onChange={() => {
                    const novo = new Set(escolhidas)
                    if (novo.has(l.linha)) novo.delete(l.linha)
                    else novo.add(l.linha)
                    setEscolhidas(novo)
                  }}
                />
                <span className="w-8 text-slate-300">{l.linha}</span>
                <span className="w-24 tabular-nums">{l.data ?? '—'}</span>
                <span className="w-24 text-right tabular-nums">
                  {l.valorCentavos === null ? '—' : formatCentavos(l.valorCentavos)}
                </span>
                <span className="flex-1 truncate text-slate-500">
                  {l.erro ?? (l.duplicada ? `${l.descricao} (já existe?)` : l.descricao)}
                </span>
              </label>
            ))}
          </div>

          <button
            onClick={importar}
            disabled={enviando}
            className="rounded-xl bg-slate-900 py-3 text-white disabled:opacity-40"
          >
            {enviando ? 'Importando…' : `Importar ${escolhidas.size} selecionadas`}
          </button>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Escrever a tela de ajustes**

`app/ajustes/page.tsx`:

```tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { ImportarCsv } from '@/components/ImportarCsv'
import { Navegacao } from '@/components/Navegacao'
import type { Categoria } from '@/lib/tipos'

export default function Ajustes() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setErro(null)
    try {
      const resposta = await fetch('/api/mes')
      if (!resposta.ok) throw new Error('falhou')
      setCategorias(((await resposta.json()) as { categorias: Categoria[] }).categorias)
    } catch {
      setErro('Não foi possível carregar.')
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function adicionar() {
    if (nome.trim() === '') return
    await fetch('/api/categorias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome }),
    })
    setNome('')
    void carregar()
  }

  async function arquivar(id: string, nomeDaCategoria: string) {
    if (!confirm(`Remover "${nomeDaCategoria}"? Os lançamentos antigos continuam classificados.`)) {
      return
    }
    await fetch(`/api/categorias/${id}`, { method: 'DELETE' })
    void carregar()
  }

  return (
    <>
      <Navegacao />
      <h1 className="text-lg font-medium">Ajustes</h1>

      {erro && <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{erro}</p>}

      <div className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm">
        <span className="text-xs text-slate-500">Categorias</span>
        {categorias.filter((c) => !c.arquivada).map((c) => (
          <div key={c.id} className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.cor }} />
            <span className="flex-1 text-sm">{c.nome}</span>
            <button
              onClick={() => void arquivar(c.id, c.nome)}
              aria-label={`Remover ${c.nome}`}
              className="text-slate-300 transition-colors hover:text-red-600"
            >
              ×
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nova categoria"
            className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm outline-none"
          />
          <button onClick={adicionar} className="rounded-xl bg-slate-900 px-5 text-white">
            +
          </button>
        </div>
      </div>

      <ImportarCsv onImportado={() => void carregar()} />
    </>
  )
}
```

- [ ] **Step 3: Verificar na prática com um arquivo de teste**

Crie `/tmp/reservas-teste.csv`:

```
data;valor;descricao
03/01/2025;1.250,00;Reserva 3 noites - Ana
15/01/2025;890,50;"Reserva 2 noites, check-in tarde"
32/13/2025;100,00;Linha com data quebrada
03/01/2025;1.250,00;Repetida de propósito
```

Percorra:

1. Subir o arquivo mostra 4 linhas: 3 válidas, 1 com erro em vermelho.
2. A linha 3 (com vírgula dentro das aspas) mostra a descrição **inteira** —
   se aparecer só "Reserva 2 noites, sem o resto, o `dividirLinha` da Task 7
   está errado.
3. A linha 5 aparece em âmbar e **desmarcada**, como provável duplicada.
4. Os números de linha mostrados são 2, 3, 4 e 5 — os do arquivo.
5. Importar grava 2 entradas (as duas não duplicadas e sem erro).
6. No resumo, navegar até janeiro/2025 mostra as entradas importadas.
7. **Subir o mesmo arquivo de novo**: agora as duas linhas boas aparecem em
   âmbar e desmarcadas, porque já existem no banco. Este passo é o que prova que
   a comparação contra o banco funciona — a do passo 3 testa só a repetição
   dentro do arquivo.

- [ ] **Step 4: Commit**

```bash
git add app/ajustes/page.tsx components/ImportarCsv.tsx
git commit -m "feat: importa histórico de reservas por CSV"
```

---

## Chunk 7: Gráfico, motion e publicação

Implementa a prioridade 5 da spec original e fecha as spec §8 e §9.

### Task 28: Gráfico de rosca por categoria

**Files:**
- Create: `components/GraficoCategorias.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Escrever o gráfico**

```tsx
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
```

- [ ] **Step 2: Encaixar no dashboard**

Em `app/page.tsx`, adicione o import:

```tsx
import { GraficoCategorias } from '@/components/GraficoCategorias'
```

e renderize dentro do bloco `{dados && (...)}`, entre `CartoesTotais` e
`Extrato`:

```tsx
<GraficoCategorias porCategoria={dados.porCategoria} categorias={dados.categorias} />
```

- [ ] **Step 3: Verificar na prática**

1. Num mês com saídas em duas categorias, a rosca mostra duas fatias com as cores
   das categorias e a legenda bate com os valores.
2. Passar o mouse sobre uma fatia mostra o valor formatado em reais.
3. Num mês sem saídas, o componente não aparece (não vira um círculo vazio).

- [ ] **Step 4: Commit**

```bash
git add components/GraficoCategorias.tsx app/page.tsx
git commit -m "feat: mostra breakdown de saídas por categoria"
```

---

### Task 29: Acabamento do motion

**Files:**
- Modify: `app/globals.css`
- Modify: `components/ModalLancamento.tsx`, `components/Extrato.tsx`, `app/page.tsx`

- [ ] **Step 1: Respeitar `prefers-reduced-motion` globalmente**

Em `app/globals.css`:

```css
/* Spec §8: se o usuário pediu menos movimento no sistema, tudo vira corte seco.
   Isto cobre as transições em CSS; o Framer Motion é coberto pelo hook
   useReducedMotion, já usado em ValorAnimado e GraficoCategorias. */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 2: Auditar as animações**

Percorra cada `motion.*` do projeto e confirme, um por um:

| Verificação | Por quê |
|---|---|
| Só anima `opacity`, `x`, `y` ou `scale` | Spec §8: largura, altura e posição de layout forçam reflow e engasgam no celular |
| Duração entre 0.15 e 0.35 | Mais rápido não é percebido; mais lento parece travado |
| Modais usam `spring`, transições de tela usam `ease` | Peso físico onde o elemento "chega"; corte limpo onde a tela troca |

Se achar algum `animate` mexendo em `width`, `height`, `top`, `left`, `margin` ou
`padding`, troque por `transform`. É o erro que mais degrada a sensação no
celular e o mais fácil de cometer sem perceber.

- [ ] **Step 3: Verificar na prática**

1. Ative "Reduzir movimento" no macOS (Ajustes → Acessibilidade → Tela) e
   recarregue: os números trocam de valor sem contar, a rosca aparece pronta, o
   modal abre sem deslizar.
2. Desative e confirme que tudo volta a animar.
3. Abra o DevTools → Rendering → marque *Paint flashing* e navegue entre meses:
   o repintar deve ficar restrito à área do conteúdo, não à página inteira.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css components app/page.tsx
git commit -m "feat: respeita preferência de movimento reduzido"
```

---

### Task 30: Publicar na Vercel

**Files:**
- Create: `README.md`

- [ ] **Step 1: Verificação final antes de publicar**

```bash
npm test && npm run typecheck && npm run build
```

Expected: os três passam. Não publique com qualquer um deles vermelho.

- [ ] **Step 2: Conferir que nenhum segredo vaza para o cliente**

```bash
grep -rn "SUPABASE_SERVICE_KEY\|APP_PIN\|APP_SESSION_SECRET" app components lib
```

Expected: as ocorrências aparecem **apenas** em `lib/supabase.ts`,
`lib/limite-tentativas.ts`, `proxy.ts` e arquivos em `app/api/`. Se algum
nome aparecer num arquivo com `'use client'`, pare e corrija: essa variável iria
para o bundle do navegador.

```bash
grep -rln "^'use client'" $(grep -rl "clienteServidor" app components lib)
```

Expected: nenhuma saída. Nenhum componente cliente pode importar o Supabase.

O `^` na expressão importa: sem ele, o próprio `lib/supabase.ts` casaria, porque
o comentário dele menciona `'use client'` no meio do texto — e você perseguiria
um alarme falso.

- [ ] **Step 3: Escrever o README**

`README.md`:

```markdown
# Studio — controle financeiro

App pessoal de controle de entradas e saídas do studio de temporada.

## Rodar local

1. `npm install`
2. Copie `.env.local.example` para `.env.local` e preencha.
3. `npm run dev`

## Variáveis de ambiente

| Nome | O que é |
|---|---|
| `SUPABASE_URL` | URL do projeto no Supabase |
| `SUPABASE_SERVICE_KEY` | service_role key — **nunca** exponha no cliente |
| `APP_PIN` | PIN de acesso, 6 dígitos ou mais |
| `APP_SESSION_SECRET` | segredo do cookie (`openssl rand -base64 32`) |

## Banco

O schema está em `supabase/schema.sql`. Cole no SQL Editor do Supabase. É
idempotente: pode rodar de novo sem duplicar o seed.

## Testes

`npm test` — cobre dinheiro, competência, totais, mapeamento, pendências, CSV e
o token de sessão. A interface não tem teste automatizado, por decisão
registrada na spec.
```

- [ ] **Step 4: Commitar antes de publicar**

```bash
git add README.md
git commit -m "docs: documenta configuração e publicação"
```

- [ ] **Step 5: Criar o repositório remoto**

O projeto nasceu de um `git init` local, sem remote. Crie o repositório
**privado** — ele guarda o histórico financeiro e o `schema.sql`:

```bash
gh repo create studio-financeiro --private --source=. --push
```

Se preferir criar pela interface do GitHub, adicione o remote à mão e
`git push -u origin main`.

- [ ] **Step 6: Publicar**

Na Vercel: importar o repositório, marcar o projeto como privado e cadastrar as
quatro variáveis de ambiente em *Settings → Environment Variables*.

- [ ] **Step 7: Verificar em produção**

1. Abrir a URL num navegador anônimo redireciona para `/entrar`.
2. O PIN certo entra; recarregar continua dentro.
3. Lançar uma entrada pelo celular e abrir no computador mostra o lançamento —
   este é o requisito que motivou o banco hospedado.
4. Errar o PIN 6 vezes seguidas devolve "Muitas tentativas". Espere 15 minutos
   (ou apague a linha em `tentativas_pin` pelo SQL Editor) para voltar a entrar.

---

## Depois de terminar

O que ficou deliberadamente de fora, registrado na spec §12: integração com API
do Airbnb ou PriceLabs, multiusuário, relatórios contábeis, conversão automática
de câmbio e import de saídas por CSV. Se algum desses voltar à mesa, vale um novo
ciclo de brainstorming em vez de emenda.
