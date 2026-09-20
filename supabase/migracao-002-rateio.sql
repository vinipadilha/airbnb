-- Migração 002: rateio do resultado entre você e o sócio.
--
-- O studio é dividido: do que sobra depois dos gastos, você fica com uma
-- porcentagem e o sócio com o resto, pago por Pix.
--
-- `entra_no_rateio` separa gasto operacional de repasse. Sem essa distinção,
-- lançar o Pix ao sócio como despesa diminuiria o líquido, que diminuiria o
-- quanto se deve a ele, que mudaria de novo o valor do Pix — a conta nunca
-- fecharia.
--
-- Idempotente: pode rodar de novo.

alter table categorias
  add column if not exists entra_no_rateio boolean not null default true;

insert into categorias (nome, cor, entra_no_rateio)
select 'Repasse ao sócio', '#64748b', false
where not exists (select 1 from categorias where entra_no_rateio = false);
