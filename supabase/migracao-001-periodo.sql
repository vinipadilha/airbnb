-- Migração 001: entrada passa a ter período (check-in e check-out).
--
-- Por quê: uma reserva longa (o studio tem uma de 244 noites, dez/2025 a
-- ago/2026) caía inteira no mês do check-in. Dezembro aparecia com R$ 29.567 e
-- ocupação de 845%, e os oito meses seguintes, zerados. Com o período, a
-- receita e as noites são rateadas pelos meses que a estadia realmente ocupa.
--
-- Idempotente: pode rodar de novo.

alter table lancamentos add column if not exists data_fim date;

-- Reconstrói a constraint de coerência por tipo, agora incluindo data_fim.
alter table lancamentos drop constraint if exists campos_por_tipo;

-- noites vira derivado (data_fim - data) e sai do banco.
alter table lancamentos drop column if exists noites;

alter table lancamentos add constraint campos_por_tipo check (
  (tipo = 'saida'
    and categoria_id is not null
    and origem is null
    and data_fim is null
    and hospedes is null)
  or
  (tipo = 'entrada'
    and categoria_id is null
    and origem is not null
    -- data_fim é opcional: receita que não é estadia não tem período.
    and (data_fim is null or data_fim > data))
);

create index if not exists lancamentos_periodo_idx on lancamentos (data, data_fim);
