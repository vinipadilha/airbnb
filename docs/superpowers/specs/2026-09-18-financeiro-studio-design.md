# App Financeiro — Studio Airbnb (Alto da Glória, Curitiba) — Design

**Data:** 2026-09-18
**Alvo:** `studio-financeiro` (projeto novo — Next.js 15 + React 19 + Supabase + Tailwind + Framer Motion + Recharts)
**Status:** Aprovado no brainstorming; pronto para plano de implementação.
**Spec de origem:** `~/Downloads/spec-app-financeiro-airbnb.md`

## 1. Objetivo

App pessoal de uso único (sem login, sem multiusuário) para registrar entradas
(reservas do Airbnb) e saídas (gastos fixos e avulsos) de um studio alugado por
temporada. Responde três perguntas: **quanto eu tenho**, **quanto sobrou este
mês** e **onde o dinheiro está indo**.

Volume esperado: ~400–600 lançamentos (histórico de jan/2025 a set/2026 mais o
corrente). Escala não é uma preocupação de projeto.

## 2. Decisões tomadas no brainstorming

| Questão | Decisão | Razão |
|---|---|---|
| Onde os dados moram | **Supabase (Postgres hospedado)** | A spec pedia SQLite, mas exigia acesso por celular e PC. SQLite local não atende sem manter o Mac ligado. Supabase é a stack que o usuário já opera no `bet-tracker`. |
| Moeda do PriceLabs | **Só BRL, valor digitado** | Cotação comercial nunca bate com a do cartão (spread + IOF). Digitar o valor da fatura é mais simples **e** mais correto. |
| Valor da reserva | **Líquido (o que caiu na conta)** | Campo único. O saldo do app bate com o extrato bancário. |
| Carga do histórico | **Tela de importar CSV** | Serve ao histórico inicial e a qualquer exportação futura, sem depender de código novo. |
| Lançamento dos gastos fixos | **Fila de pendências confirmada pelo usuário** | A spec pede explicitamente confirmar/ajustar antes de salvar. Não depende de rotina agendada. |

## 3. Modelo de dados (Supabase / Postgres)

Sem tabela de usuários. Quatro tabelas.

### `categorias`
`id · nome · cor · arquivada (bool)`

Seed: Limpeza, Manutenção, Compras / utensílios, Contas fixas, Outros.
Exclusão é **arquivamento** (soft-delete): a categoria some dos selects mas os
lançamentos históricos continuam classificados.

### `lancamentos` — tabela central
`id · tipo ('entrada'|'saida') · data · valor_centavos (int) · descricao ·
categoria_id (FK, só saídas) · origem (só entradas, default 'Airbnb') ·
noites (int, opcional) · hospedes (int, opcional) · criado_em`

**Entradas e saídas na mesma tabela.** Toda tela do app (saldo, extrato do mês,
navegação por mês) mistura as duas; separar em duas tabelas transformaria cada
consulta num `UNION`.

**Valores em centavos, inteiro — nunca float.** Ponto flutuante acumula erro de
arredondamento em somas, e o app existe justamente para somar dinheiro.

### `gastos_fixos`
`id · nome · valor_referencia_centavos · categoria_id · dia_sugerido · ativo (bool)`

Seed: Internet (R$ 98,00) e PriceLabs (valor de referência editável), ambos na
categoria "Contas fixas". CRUD livre depois — a lista de 2 é só ponto de partida.

### `gastos_fixos_lancados` — controle de idempotência
`gasto_fixo_id · competencia ('YYYY-MM') · lancamento_id`

**Chave única em (`gasto_fixo_id`, `competencia`).** É a garantia, no banco e não
na aplicação, de que um gasto fixo nunca é lançado duas vezes no mesmo mês —
mesmo com dois dispositivos abertos ao mesmo tempo.

Desativar ou remover um gasto fixo **não** apaga os lançamentos já gerados. O
histórico não muda retroativamente.

## 4. Telas

Três rotas e um modal.

### `/` — Dashboard
De cima para baixo:

1. **Card de pendências** (condicional) — se o mês corrente tem gastos fixos não
   lançados: *"2 gastos fixos de setembro ainda não lançados"*. Abre uma lista
   com os valores de referência preenchidos e editáveis, checkbox por item,
   confirma e grava.
2. **Seletor de mês** — `‹ setembro 2026 ›`, navegando para meses anteriores e
   posteriores.
3. **Três números** — Entradas, Saídas, Saldo do mês. Saldo total do histórico
   discreto abaixo.
4. **Gráfico de rosca** — saídas por categoria no mês.
5. **Extrato do mês** — agrupado por dia, ordenado por data; cada item abre para
   editar ou excluir.

### `/fixos` — Gastos fixos
Lista com nome, valor de referência, categoria e status de lançamento no mês
corrente. Adicionar, editar, desativar.

### `/ajustes` — Categorias e importação
CRUD de categorias e a tela de importar CSV.

### Modal de lançamento
Botão `+` flutuante, acessível de qualquer tela. Toggle Entrada/Saída no topo
alterna os campos (categoria para saída; origem, noites e hóspedes para entrada).
É modal e não página porque registrar um gasto precisa ser uma operação de
10 segundos sem perder o contexto.

**Navegação:** barra inferior de 3 itens no celular, topo no desktop.

## 5. Import de CSV

Colunas: `data, valor, descricao` (e opcionalmente `noites`, `hospedes`).
Fluxo: colar texto ou subir arquivo → **preview validado linha a linha** →
confirmar.

- Linhas inválidas (data ilegível, valor não numérico) são marcadas e não
  bloqueiam as demais.
- Prováveis duplicados — mesma `data` + mesmo `valor_centavos` já existentes —
  vêm desmarcados por padrão, com aviso.
- Nada é gravado antes da confirmação.

## 6. Motion

Framer Motion. As regras que separam "fluido" de "travado":

- **Anima apenas `transform` e `opacity`.** Nunca largura, altura ou posição de
  layout — é o que engasga no celular. Tudo que se move, se move na GPU.
- **150–350ms.** Spring nos modais (peso físico), ease nas transições de tela.
- **Troca de mês** desliza na direção da navegação, via `AnimatePresence`.
- **Números contam** do valor anterior ao novo em vez de trocar seco.
- **Lista entra escalonada**, ~30ms entre itens.
- **Gráfico cresce do zero** na primeira renderização.
- **`prefers-reduced-motion` respeitado** — reduz tudo a corte seco.

Valores monetários usam **números tabulares** (`tabular-nums`). Sem isso o
count-up faz o número tremer horizontalmente, porque cada dígito tem largura
diferente.

## 7. Layout e respiro

Escala de espaçamento de 4px. `gap` de 24px entre cards no desktop, 16px no
celular. Cards separados por espaço e sombra suave, **sem bordas**. Paleta
neutra com uma cor de destaque; verde e vermelho reservados exclusivamente para
entrada e saída, para carregarem significado em vez de decorarem.

## 8. Erros e casos-limite

| Situação | Comportamento |
|---|---|
| Falha de rede / Supabase fora | Aviso com botão de tentar de novo. Dados já carregados permanecem na tela. Nunca tela branca. |
| Mês sem lançamentos | Estado inicial convidando a lançar, não tela vazia. |
| Excluir lançamento | Pede confirmação. |
| Remover gasto fixo já lançado | Lançamentos históricos preservados. |
| Import com duplicados | Detectados por data + valor, desmarcados por padrão. |
| Dois dispositivos lançando o mesmo fixo | Bloqueado pela chave única em `gastos_fixos_lancados`. |

## 9. Testes

A lógica de dinheiro fica isolada em `lib/`, sem React, testada com `node:test`
(mesmo padrão do `bet-tracker`):

- soma de totais do mês (entradas, saídas, saldo, saldo acumulado);
- agrupamento de saídas por categoria;
- parser e validador de CSV, incluindo detecção de duplicados;
- cálculo de quais gastos fixos estão pendentes numa competência.

A interface não tem teste automatizado. Para um app pessoal, o custo excederia o
retorno.

## 10. Fora de escopo

- Integração com API do Airbnb ou PriceLabs (indisponível para anfitrião individual).
- Multiusuário, login, permissões.
- Relatórios fiscais ou contábeis formais.
- Conversão automática de câmbio.

## 11. Ordem de construção

1. Schema no Supabase + CRUD de entradas e saídas com categoria
2. Dashboard com saldo e navegação por mês
3. Gastos fixos com fila de pendências
4. Import de CSV do histórico
5. Gráfico de breakdown por categoria
6. Camada de motion
