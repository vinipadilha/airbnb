-- Migração 007: separa a data da estadia da data em que o dinheiro cai.
--
-- O Airbnb paga em D+1: a reserva com check-in em 31/10 só vira dinheiro em
-- 01/11. Antes o app usava a data do check-in para tudo, então essa reserva
-- entrava em outubro e o mês não batia com o extrato do banco.
--
-- Agora são duas datas com papéis diferentes:
--   data       = check-in da estadia (com data_fim, desenha o calendário)
--   data_caixa = quando o dinheiro entra ou sai (é o que os totais usam)
--
-- Em saídas as duas são iguais: o gasto acontece quando acontece.
--
-- Idempotente: pode rodar de novo.

alter table lancamentos add column if not exists data_caixa date;

-- Backfill: entrada recebe D+1, saída fica igual. Só preenche o que está
-- nulo, para não desfazer ajuste manual de quem já corrigiu uma data.
update lancamentos
set data_caixa = case when tipo = 'entrada' then data + 1 else data end
where data_caixa is null;

alter table lancamentos alter column data_caixa set not null;

create index if not exists lancamentos_data_caixa_idx on lancamentos (data_caixa desc);
