-- Migração 008: tema claro, escuro ou seguindo o sistema.
--
-- Fica no banco, e não só no navegador, para a escolha valer em todos os
-- aparelhos: trocar para escuro no celular troca no computador também. O
-- navegador guarda uma cópia só para pintar a tela certa antes de a
-- resposta do banco chegar.
--
-- Idempotente: pode rodar de novo.

alter table configuracoes
  add column if not exists tema text not null default 'sistema'
  check (tema in ('claro', 'escuro', 'sistema'));
