-- Migração 009: teto mensal do sócio na divisão do resultado.
-- Nulo = só porcentagem (comportamento anterior). Com valor, o sócio fica no
-- máximo com esse teto por mês e o excedente do líquido é todo seu.
alter table configuracoes
  add column if not exists limite_socio_centavos integer
  check (limite_socio_centavos is null or limite_socio_centavos > 0);
