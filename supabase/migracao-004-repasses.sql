-- Migração 004: repasse ao sócio ganha tabela própria.
--
-- Antes o repasse era uma saída numa categoria especial. Conceitualmente
-- errado: mandar o Pix ao sócio não é custo de operar o studio, é acerto da
-- parte dele — e misturado no extrato parecia despesa. Agora tem tabela
-- separada e se registra direto no card de divisão do resultado.
--
-- Idempotente: pode rodar de novo.

create table if not exists repasses (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  valor_centavos integer not null check (valor_centavos > 0),
  observacao text not null default '',
  criado_em timestamptz not null default now()
);

alter table repasses enable row level security;

create index if not exists repasses_data_idx on repasses (data desc);

-- A categoria de repasse sai de circulação: quem registra repasse agora é a
-- tabela acima. Arquivar em vez de apagar preserva qualquer lançamento
-- antigo que tenha sido classificado nela.
update categorias set arquivada = true where entra_no_rateio = false;
