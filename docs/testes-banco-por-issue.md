# Banco de teste por issue

A suíte de integração zera o banco de teste a cada execução (`packages/db/test/support/reset-database.ts`). Duas issues rodando a suíte ao mesmo tempo no mesmo Postgres se apagariam uma à outra, então cada issue usa o seu banco: `crm_<n>_test` (ex.: `crm_124_test`).

## Criar o banco

```
tools/db/create-issue-test-db.sh 124
```

O script é idempotente:

- banco novo: `CREATE DATABASE … OWNER crm_owner`, `REVOKE ALL … FROM PUBLIC`, `GRANT CONNECT, TEMPORARY` a `crm_owner`, `GRANT CONNECT` a `crm_app`, e aplica `packages/db/sql/public-schema.sql` (o mesmo que o `docker/postgres/init.sh` faz);
- banco existente: só reforça o `REVOKE`/`GRANT`. Nunca derruba o banco nem apaga dados.

Não crie bancos do CRM "na mão": com a ACL padrão do Postgres (`CONNECT` para `PUBLIC`), `packages/db/test/roles.integration.test.ts` falha para todas as suítes que dividem a instância.

## Conexão

Só pelo ambiente; o script não guarda nem imprime senha. Use um dos dois:

- `SUPERUSER_DATABASE_URL` (ex.: `postgres://usuário:senha@host:5433/postgres`; o banco da URL é ignorado, o script conecta em `postgres`);
- as variáveis padrão do libpq: `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`.

O usuário precisa criar bancos e conceder privilégios (superusuário). Requer `psql` no `PATH`.

## Usar na suíte

Aponte `DATABASE_URL` e `MIGRATION_DATABASE_URL` para `crm_<n>_test` (variáveis do ambiente têm precedência sobre `.env.test`). A trava de `reset-database.ts` continua exigindo o sufixo `_test`.

## Teste

`apps/api/test/tools/create-issue-test-db.integration.test.ts` roda o script contra o Postgres do container, com um banco descartável que apaga no fim: criar duas vezes não falha, `PUBLIC` não tem `CONNECT`, e rodar de novo repara a ACL sem apagar dados.
