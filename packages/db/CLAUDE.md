# packages/db

Schema Drizzle e migrations: fonte única da verdade das tabelas.

- **Spec:** `docs/specs/fase-0-monorepo.md` (pacote, pool, container); `docs/specs/fase-0-banco-e-rls.md` (schema, RLS, wrappers)
- **Tabelas que possui:** `tenants`, `access_profiles` — colunas de todas as fases em `docs/specs/modelo-de-dados.md`
- **Depende de:** `@crm/shared`

## Convenções locais

- Dois papéis do banco (`CONTEXT.md`): migrations rodam como `crm_owner` (`MIGRATION_DATABASE_URL`); a aplicação conecta como `crm_app` (`DATABASE_URL`). Nunca troque.
- Pool sempre por `createPool()`, limitado a 10 conexões — a instância de produção é compartilhada.
- `sql/public-schema.sql` é o estado do schema `public`, aplicado pelo init do container e pelo setup da integração. Grants por tabela vão na migration da tabela.
- A aplicação só fala com o banco por `createDatabase(pool)`: `withTenant(tenantId, fn)` para consulta de negócio, `semTenant(context, fn)` para os três casos nominais (login, CLI, super admin). Não exporte o Drizzle nem crie alias de `semTenant`.
- Tabela de negócio usa `tenantId()` e `tenantIsolationPolicy()` de `src/schema/tenant-scope.ts`, e `id()`/`timestamps` de `src/schema/columns.ts`. O Drizzle não gera `FORCE ROW LEVEL SECURITY` nem grants: acrescente os dois à mão no fim da migration gerada, como em `migrations/0000_*.sql`.
- Gerar migration: `pnpm --filter @crm/db generate`. Aplicar: `pnpm db:migrate`.
- Teste de integração termina em `.integration.test.ts`; o setup (`test/global-setup.ts`) zera o banco `*_test` e aplica as migrations do zero.
