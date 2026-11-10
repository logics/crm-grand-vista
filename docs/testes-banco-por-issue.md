# Banco de teste por checkout

A suíte de integração zera o banco de teste a cada execução (`packages/db/test/support/reset-database.ts`). Dois checkouts rodando a suíte ao mesmo tempo no mesmo Postgres se apagariam um ao outro, então cada checkout usa o seu banco, sem passo manual.

## Nome do banco

Derivado da branch do checkout (`packages/db/test/support/test-database-name.ts`):

- `CI` definido, branch `main` ou git sem branch (HEAD destacada): `crm_test`;
- `feat/129-avisos-duplicata` (`<tipo>/<n>-…`): `crm_129_test`;
- outra branch: slug da branch, ex.: `chore/test-db-por-issue` vira `crm_chore_test_db_por_issue_test` (cortado em 63 bytes, com hash, se for longo).

Todo nome termina em `_test`, como a trava de `reset-database.ts` exige. Se o ambiente trouxer `DATABASE_URL`, `MIGRATION_DATABASE_URL` ou `SUPERUSER_DATABASE_URL`, host e credenciais são mantidos, mas o banco do caminho é sempre o do checkout.

## O que `pnpm test:integration` faz

O setup global (`packages/db/test/support/global-setup.ts`), com a conexão de superusuário do `.env.test` (`SUPERUSER_DATABASE_URL`):

1. Cria o banco se faltar (`OWNER crm_owner`, aplicando `packages/db/sql/public-schema.sql`) e sempre reforça a ACL do `docker/postgres/init.sh` (`REVOKE` de `PUBLIC`, `CONNECT` para `crm_owner` e `crm_app`). Guarda a branch no comentário do banco. Nunca apaga dados de banco existente.
2. Derruba os bancos `crm_*_test` de branches já mergeadas.
3. Zera e migra o banco do checkout.

Não crie bancos do CRM "na mão": com a ACL padrão do Postgres (`CONNECT` para `PUBLIC`), `packages/db/test/roles.integration.test.ts` falha.

## Limpeza de branch mergeada

Só com prova do git local (sem `fetch`, sem `gh`), em relação a `main` ou `origin/main`:

- a branch existe e seu tip é ancestral da base, fora do `--first-parent` (branch nova sem commits não conta como mergeada); ou
- a branch foi apagada e a base tem o merge commit `Merge pull request #<n> from <dono>/<branch>`.

Qualquer dúvida mantém o banco: sem comentário, base ausente, erro do git ou banco em uso. `crm_test`, `crm_dev`, o banco corrente e nomes fora de `crm_*_test` nunca são derrubados. O `DROP` é sem `FORCE`.

## CI, main e e2e

No CI e em `main` a suíte usa `crm_test`, o mesmo do `.env.test`. O e2e segue em `crm_test`.
