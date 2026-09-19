# App Financeiro — Studio Airbnb (Alto da Glória, Curitiba) — Design

**Data:** 2026-09-18
**Alvo:** `studio-financeiro` (projeto novo — Next.js 15 + React 19 + Supabase + Tailwind + Framer Motion + Recharts)
**Status:** Aprovado no brainstorming; pronto para plano de implementação.
**Spec de origem:** `~/Downloads/spec-app-financeiro-airbnb.md`

## 1. Objetivo

App pessoal de uso único (sem multiusuário) para registrar entradas (reservas do
Airbnb) e saídas (gastos fixos e avulsos) de um studio alugado por temporada.
Responde três perguntas: **quanto eu tenho**, **quanto sobrou este mês** e **onde
o dinheiro está indo**.

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

## 3. Acesso e segurança

A spec original dispensou login por assumir banco local. Com o app publicado na
internet, essa dispensa deixa dados financeiros abertos a qualquer um com a URL.
O desenho corrige isso sem introduzir cadastro de usuários:

- **Nenhuma credencial do Supabase vai para o navegador.** Todo acesso ao banco
  passa por route handlers do Next.js no servidor, usando a *service role key*
  em variável de ambiente. O cliente fala só com a própria API do app.
- **RLS ligado em todas as tabelas, sem policy pública.** Se uma chave vazar, ela
  não lê nada. A service role key contorna RLS por natureza — é por isso que ela
  nunca sai do servidor.
- **PIN único** de no mínimo 6 dígitos, guardado em variável de ambiente. Uma
  tela pede o PIN e o servidor valida.
- **O cookie é um token assinado**, não uma flag. Guarda um HMAC-SHA256 sobre a
  data de expiração, com segredo do servidor, em cookie `httpOnly` + `secure` +
  `SameSite=Lax`, válido por 180 dias. Uma flag do tipo `auth=1` seria inútil:
  qualquer visitante a definiria no próprio navegador e o middleware passaria.
- **Limite de tentativas:** 5 falhas por IP a cada 15 minutos, **mais um teto
  global de 20 falhas por janela**, contados numa tabela do próprio Supabase.
  O teto global é o que importa de verdade: o IP vem de cabeçalho HTTP, e quem
  ataca pode variá-lo a cada tentativa para ganhar um balde novo. Contra o
  contador global não há cabeçalho que ajude. Precisa ser armazenamento
  compartilhado: na Vercel, um contador em memória vive por instância e morre a
  cada cold start, ou seja, não limita nada. Sem isso, um PIN numérico num
  endpoint público cai em minutos de tentativa automatizada.
- Middleware bloqueia todas as rotas sem cookie válido. Na prática você digita o
  PIN uma vez por aparelho.

Isso não é "login" no sentido que a spec descartou: não há cadastro, e-mail,
recuperação de senha nem usuários. É uma tranca na porta.

**Deploy:** Vercel, projeto privado, com `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`,
`APP_PIN` e `APP_SESSION_SECRET` como variáveis de ambiente.

## 4. Modelo de dados (Supabase / Postgres)

Sem tabela de usuários. Quatro tabelas de domínio mais uma de apoio.

### `categorias`
`id · nome · cor · arquivada (bool)`

Seed: Limpeza, Manutenção, Compras / utensílios, Contas fixas, Outros.
Exclusão é **arquivamento** (soft-delete): a categoria some dos selects mas os
lançamentos históricos continuam classificados.

### `lancamentos` — tabela central
`id · tipo ('entrada'|'saida') · data (date) · valor_centavos (int) · descricao ·
categoria_id (FK, só saídas) · origem (só entradas) ·
noites (int, opcional) · hospedes (int, opcional) · criado_em (timestamptz)`

**`origem` não tem `DEFAULT 'Airbnb'` no banco.** Um default dispara em todo
INSERT que omita a coluna, inclusive o de uma saída — que o `CHECK` então
rejeitaria, a não ser que o código lembrasse de passar `NULL` explicitamente.
O valor `'Airbnb'` vem pré-preenchido no formulário de entrada, onde não
atrapalha ninguém. `criado_em` é coluna de auditoria e serve de critério de
desempate na ordenação de lançamentos do mesmo dia.

**Entradas e saídas na mesma tabela.** Toda tela do app (saldo, extrato do mês,
navegação por mês) mistura as duas; separar em duas tabelas transformaria cada
consulta num `UNION`.

**Valores em centavos, inteiro — nunca float.** Ponto flutuante acumula erro de
arredondamento em somas, e o app existe justamente para somar dinheiro.
`valor_centavos` tem `CHECK (valor_centavos > 0)`: o sinal vem do `tipo`, não do
valor. Data futura é permitida (reservas já confirmadas).

**`data` é `date`, não `timestamptz`.** O app inteiro é organizado por competência
mensal e o Supabase roda em UTC, enquanto o usuário está em America/Sao_Paulo. Um
lançamento às 22h do dia 31 cairia no mês seguinte se o agrupamento fosse feito em
UTC. A competência é derivada da string `YYYY-MM` da data, sem conversão de fuso.

Um `CHECK` no banco garante a coerência dos campos por tipo:

- **saída** exige `categoria_id`; proíbe `origem`, `noites` e `hospedes`;
- **entrada** exige `origem`; proíbe `categoria_id`; aceita `noites` e
  `hospedes` como opcionais (podem ser nulos).

`noites` e `hospedes` têm `CHECK (… IS NULL OR … > 0)`, pelo mesmo motivo que
`valor_centavos`: zero e negativo não significam nada aqui.

### `gastos_fixos`
`id · nome · valor_referencia_centavos · categoria_id · arquivada (bool) ·
competencia_inicial ('YYYY-MM')`

Seed: Internet (R$ 98,00) e PriceLabs (R$ 110,00 como valor de referência
inicial, editável na primeira confirmação), ambos na categoria "Contas fixas".
CRUD livre depois — a lista de 2 é só ponto de partida.

**`competencia_inicial` é texto `YYYY-MM`, calculado no fuso do usuário no
momento do cadastro** — não um `timestamptz`. Extrair o mês de um timestamp UTC
reintroduziria exatamente o bug que `lancamentos.data` evita: um gasto fixo
cadastrado às 22h de 30/09 em São Paulo é 01/10 em UTC, e não geraria a
pendência de setembro.

**"Remover" é arquivar** (`arquivada = true`, mesmo nome e mesmo sentido de
`categorias` — booleano invertido com nome diferente entre tabelas é convite a
erro no ponto de consulta). O item some da tela, o que atende ao requisito de
remover livremente, e os lançamentos que ele já gerou continuam intactos. O
histórico nunca muda retroativamente.

### `gastos_fixos_lancados` — controle de idempotência
`gasto_fixo_id · competencia ('YYYY-MM') · lancamento_id`

**Chave única em (`gasto_fixo_id`, `competencia`).** É a garantia, no banco e não
na aplicação, de que um gasto fixo nunca é lançado duas vezes no mesmo mês —
mesmo com dois dispositivos abertos ao mesmo tempo.

**`lancamento_id` tem `ON DELETE CASCADE`.** Se o usuário excluir no extrato um
lançamento que veio da fila, a linha de controle morre junto e o gasto fixo volta
a aparecer como pendente naquele mês. Sem o cascade, a linha ficaria órfã e o
gasto fixo nunca mais poderia ser relançado.

### `tentativas_pin` — apoio ao limite de tentativas (§3)
`ip · janela ('YYYY-MM-DDTHH:mm' arredondado a 15 min) · tentativas`

Precisa ser tabela, e não memória do processo, pelo motivo dado em §3. No volume
deste app não vale rotina de limpeza: linhas antigas podem ser ignoradas na
consulta e apagadas de vez em quando, se um dia incomodarem.

## 5. Regra de pendências

A fila existe **apenas para o mês corrente**. Meses passados não geram
pendências — o histórico importado não deve ser poluído com gastos fixos que
nunca existiram naquela época.

Um gasto fixo é pendente quando, simultaneamente: não está arquivado, sua
`competencia_inicial` é menor ou igual à competência atual, e não tem linha em
`gastos_fixos_lancados` para a competência atual.

Cadastrar um gasto fixo hoje, portanto, o torna pendente a partir deste mês —
nunca retroativamente.

**Consequência aceita:** se o app não for aberto durante um mês inteiro, as
pendências daquele mês somem — ele vira passado, e passado não gera fila. É o
custo de não ter rotina agendada. Os gastos podem ser lançados à mão pelo modal,
com a data correta, se você quiser recuperá-los.

## 6. Telas

Três rotas e um modal.

### `/` — Dashboard
De cima para baixo:

1. **Card de pendências** (condicional) — se o mês corrente tem gastos fixos não
   lançados: *"2 gastos fixos de setembro ainda não lançados"* — a contagem e o
   nome do mês são derivados da competência corrente, não fixos no texto. Abre uma lista
   com os valores de referência preenchidos e editáveis, checkbox por item,
   confirma e grava. Aparece apenas quando o mês exibido é o corrente.
2. **Seletor de mês** — `‹ setembro 2026 ›`, navegando para meses anteriores e
   posteriores.
3. **Três números** — Entradas, Saídas, Saldo do mês. Saldo total do histórico
   discreto abaixo.
4. **Gráfico de rosca** — saídas por categoria no mês.
5. **Extrato do mês** — agrupado por dia, **do mais recente para o mais
   antigo**; cada item abre o mesmo modal de lançamento em modo edição, com
   opção de excluir.

### `/fixos` — Gastos fixos
Lista com nome, valor de referência, categoria e status de lançamento no mês
corrente. Adicionar, editar, remover (arquivar).

### `/ajustes` — Categorias e importação
CRUD de categorias e a tela de importar CSV.

### Modal de lançamento
Botão `+` flutuante, acessível de qualquer tela. Toggle Entrada/Saída no topo
alterna os campos (categoria para saída; origem, noites e hóspedes para entrada).
O mesmo componente serve para criar e editar. É modal e não página porque
registrar um gasto precisa ser uma operação de 10 segundos sem perder o contexto.

Um lançamento é reconhecido como gerado pela fila quando existe linha em
`gastos_fixos_lancados` apontando para ele — é daí que sai a regra a seguir.

**Lançamentos gerados pela fila de gastos fixos têm a data restrita ao mês da
competência.** Valor e descrição são livres; mover o lançamento para outro mês
não é permitido, porque deixaria `gastos_fixos_lancados.competencia` apontando
para um mês onde a despesa não está mais — o mês de origem pareceria quitado e o
mês de destino, pendente. Para mover de mês, exclua (o gasto volta à fila) e
lance de novo.

**Navegação:** barra inferior de 3 itens no celular, topo no desktop.

## 7. Import de CSV

**Escopo: apenas entradas.** Toda linha importada vira `tipo='entrada'` com
`origem='Airbnb'`. Saídas são lançadas pelo modal — o histórico a importar é de
reservas, e uma coluna de categoria obrigaria a mapear nomes de categoria a IDs,
complexidade sem demanda hoje.

**Formato aceito** (um parser tolerante, porque o usuário vai colar coisa vinda
do Excel brasileiro):

| Aspecto | Aceito |
|---|---|
| Cabeçalho | Obrigatório, primeira linha: `data`, `valor`, `descricao`, e opcionalmente `noites`, `hospedes`. Ordem livre, acento e caixa ignorados. |
| Separador de coluna | Detectado automaticamente: `;` (padrão do Excel pt-BR) ou `,`. |
| Data | `DD/MM/AAAA` ou `AAAA-MM-DD`. |
| Valor | `1.234,56` (pt-BR) ou `1234.56`. Prefixo `R$` e espaços são ignorados. |
| Encoding | UTF-8, com fallback para Latin-1. |

Fluxo: colar texto ou subir arquivo → **preview validado linha a linha** →
confirmar.

- Linhas inválidas (data ilegível, valor não numérico, valor ≤ 0) são marcadas
  com o motivo e não bloqueiam as demais.
- `noites` e `hospedes` não numéricos não invalidam a linha: viram nulos.
- Prováveis duplicados — mesma `data` + mesmo `valor_centavos` — vêm desmarcados
  por padrão, com aviso. A checagem cobre tanto lançamentos já no banco quanto
  repetições **dentro do próprio arquivo**, caso comum em exportação colada duas
  vezes.
- Nada é gravado antes da confirmação.

## 8. Motion

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

## 9. Layout e respiro

Escala de espaçamento de 4px. `gap` de 24px entre cards no desktop, 16px no
celular. Cards separados por espaço e sombra suave, **sem bordas**. Paleta
neutra com uma cor de destaque; verde e vermelho reservados exclusivamente para
entrada e saída, para carregarem significado em vez de decorarem.

## 10. Erros e casos-limite

| Situação | Comportamento |
|---|---|
| Falha de rede / Supabase fora | Aviso com botão de tentar de novo. Dados já carregados permanecem na tela. Nunca tela branca. |
| PIN incorreto | Mensagem genérica, sem indicar se o PIN existe. |
| Mês sem lançamentos | Estado inicial convidando a lançar, não tela vazia. |
| Excluir lançamento | Pede confirmação. |
| Excluir lançamento gerado pela fila | Gasto fixo volta a constar como pendente no mês (cascade). |
| Remover gasto fixo já lançado | Arquivado; lançamentos históricos preservados. |
| Import com duplicados | Detectados por data + valor, tanto contra o banco quanto dentro do próprio arquivo; desmarcados por padrão. |
| Valor zero ou negativo | Rejeitado no formulário e no banco (`CHECK`). |
| PIN tentado repetidamente | 5 falhas por IP e 20 no total a cada 15 min bloqueiam novas tentativas. |
| Editar mês de lançamento gerado pela fila | Bloqueado; a data fica restrita ao mês da competência. |
| App não aberto durante um mês | As pendências daquele mês não reaparecem; lançamento manual, se quiser. |
| Dois dispositivos lançando o mesmo fixo | Bloqueado pela chave única em `gastos_fixos_lancados`. |

## 11. Testes

A lógica de dinheiro fica isolada em `lib/`, sem React, testada com `node:test`
(mesmo padrão do `bet-tracker`):

- soma de totais do mês (entradas, saídas, saldo, saldo acumulado);
- agrupamento de saídas por categoria;
- parser e validador de CSV: separadores, formatos de data e valor, linhas
  inválidas, detecção de duplicados. A função de duplicidade **recebe os
  lançamentos existentes como argumento** em vez de consultar o Supabase — sem
  isso não há como testá-la sem banco;
- cálculo de gastos fixos pendentes, incluindo os cortes por `arquivada` e por
  `competencia_inicial`;
- assinatura, verificação e expiração do token de sessão. Mora em `lib/` e é a
  única coisa entre a URL pública e os dados — barato de testar, caro de errar.

A interface não tem teste automatizado. Para um app pessoal, o custo excederia o
retorno.

## 12. Fora de escopo

- Integração com API do Airbnb ou PriceLabs (indisponível para anfitrião individual).
- Multiusuário, cadastro, recuperação de senha, permissões.
- Relatórios fiscais ou contábeis formais.
- Conversão automática de câmbio.
- Import de saídas por CSV.

## 13. Ordem de construção

1. Schema no Supabase + RLS + acesso server-side + PIN com token assinado
2. CRUD de entradas e saídas com categoria
3. Dashboard com saldo e navegação por mês
4. Gastos fixos com fila de pendências
5. Import de CSV do histórico
6. Gráfico de breakdown por categoria
7. Camada de motion
