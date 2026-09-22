-- Migração 006: quem pagou a despesa.
--
-- Algumas despesas do studio são pagas pelo sócio direto do bolso dele — o
-- condomínio, por exemplo. Quem paga **não** muda o resultado do mês: a
-- despesa desconta do líquido do mesmo jeito, porque é dos dois.
--
-- O que muda é o acerto. A receita inteira cai na sua conta, então o que o
-- sócio adiantou precisa voltar junto com a parte dele no lucro:
--
--     Pix ao sócio = parte dele no líquido + o que ele pagou do bolso
--
-- Sem isso ele arcaria sozinho com uma despesa que é dos dois.
--
-- Idempotente: pode rodar de novo.

alter table lancamentos
  add column if not exists pago_por text not null default 'voce'
  check (pago_por in ('voce', 'socio'));

alter table gastos_fixos
  add column if not exists pago_por text not null default 'voce'
  check (pago_por in ('voce', 'socio'));

-- Entrada cai sempre na sua conta: só saída tem quem pagou.
alter table lancamentos drop constraint if exists entrada_sempre_sua;
alter table lancamentos add constraint entrada_sempre_sua
  check (tipo = 'saida' or pago_por = 'voce');

create index if not exists lancamentos_pago_por_idx on lancamentos (pago_por)
  where pago_por = 'socio';
