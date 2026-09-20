-- Schema do app financeiro do studio. Idempotente: pode rodar de novo.
create extension if not exists "pgcrypto";

create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cor text not null default '#94a3b8',
  arquivada boolean not null default false,
  -- Falso só na categoria de repasse ao sócio: pagar o sócio não é custo de
  -- operação, é quitação da parte dele. Ver migracao-002-rateio.sql.
  entra_no_rateio boolean not null default true
);

create table if not exists lancamentos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('entrada', 'saida')),
  -- Em entradas, `data` é o check-in e `data_fim` é o check-out. As noites são
  -- derivadas da diferença, e receita e ocupação são rateadas pelos meses que
  -- a estadia atravessa — sem isso, uma reserva longa cai inteira no mês do
  -- check-in e zera os meses seguintes.
  data date not null,
  data_fim date,
  valor_centavos integer not null check (valor_centavos > 0),
  descricao text not null default '',
  categoria_id uuid references categorias(id),
  -- Sem DEFAULT de propósito: um default dispararia em INSERT de saída e a
  -- constraint campos_por_tipo rejeitaria a linha. 'Airbnb' é pré-preenchido
  -- no formulário de entrada, não no banco.
  origem text,
  hospedes integer check (hospedes is null or hospedes > 0),
  criado_em timestamptz not null default now(),
  constraint campos_por_tipo check (
    (tipo = 'saida'
      and categoria_id is not null
      and origem is null
      and data_fim is null
      and hospedes is null)
    or
    (tipo = 'entrada'
      and categoria_id is null
      and origem is not null
      and (data_fim is null or data_fim > data))
  )
);

create index if not exists lancamentos_data_idx on lancamentos (data desc, criado_em desc);
create index if not exists lancamentos_periodo_idx on lancamentos (data, data_fim);

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
insert into categorias (nome, cor, entra_no_rateio)
select * from (values
  ('Limpeza',             '#38bdf8', true),
  ('Manutenção',          '#fb923c', true),
  ('Compras / utensílios','#a78bfa', true),
  ('Contas fixas',        '#34d399', true),
  ('Outros',              '#94a3b8', true),
  ('Repasse ao sócio',    '#64748b', false)
) as v(nome, cor, entra_no_rateio)
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
