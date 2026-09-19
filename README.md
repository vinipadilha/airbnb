# Studio — controle financeiro

App pessoal de controle de entradas e saídas do studio de temporada.

## Rodar local

1. `npm install`
2. Copie `.env.local.example` para `.env.local` e preencha.
3. `npm run dev`

## Variáveis de ambiente

| Nome | O que é |
|---|---|
| `SUPABASE_URL` | URL do projeto no Supabase |
| `SUPABASE_SERVICE_KEY` | service_role key — **nunca** exponha no cliente |
| `APP_PIN` | PIN de acesso, 6 dígitos ou mais |
| `APP_SESSION_SECRET` | segredo do cookie (`openssl rand -base64 32`) |

## Banco

O schema está em `supabase/schema.sql`. Cole no SQL Editor do Supabase. É
idempotente: pode rodar de novo sem duplicar o seed.

## Testes

`npm test` — cobre dinheiro, competência, totais, mapeamento, pendências, CSV e
o token de sessão. A interface não tem teste automatizado, por decisão
registrada na spec.
