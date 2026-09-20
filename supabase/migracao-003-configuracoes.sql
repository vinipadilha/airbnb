-- Migração 003: configurações do negócio no banco, não no ambiente.
--
-- O percentual da sociedade e o nome do sócio são regra de negócio, não
-- infraestrutura: mudam por decisão sua, não por deploy. Ficar em variável de
-- ambiente obrigava a mexer na Vercel para trocar um número.
--
-- Tabela de uma linha só (id fixo em 1), para não haver ambiguidade sobre
-- qual configuração vale.
--
-- Idempotente: pode rodar de novo.

create table if not exists configuracoes (
  id smallint primary key default 1 check (id = 1),
  percentual_gestao smallint not null default 12
    check (percentual_gestao between 0 and 100),
  nome_socio text not null default 'Sócio'
);

alter table configuracoes enable row level security;

insert into configuracoes (id, percentual_gestao, nome_socio)
values (1, 12, 'Meu pai')
on conflict (id) do nothing;
