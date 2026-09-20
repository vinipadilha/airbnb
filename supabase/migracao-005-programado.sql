-- Migração 005: reserva programada.
--
-- Reserva que o Airbnb ainda vai pagar é previsão, não dinheiro. Enquanto
-- `recebido` for falso ela fica fora do saldo, das entradas do mês e do
-- rateio com o sócio — aparece só como "a receber". Repassar sobre reserva
-- programada seria pagar o sócio com dinheiro que ainda não existe, e o
-- hóspede ainda pode cancelar.
--
-- Default true: tudo que já está no banco é histórico, dinheiro que entrou.
--
-- Idempotente: pode rodar de novo.

alter table lancamentos
  add column if not exists recebido boolean not null default true;

-- Saída não tem "programado": o gasto é lançado quando acontece.
alter table lancamentos drop constraint if exists saida_sempre_recebida;
alter table lancamentos add constraint saida_sempre_recebida
  check (tipo = 'entrada' or recebido = true);

create index if not exists lancamentos_recebido_idx on lancamentos (recebido)
  where recebido = false;
