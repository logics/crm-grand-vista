# packages/db

Schema Drizzle e migrations: fonte única da verdade das tabelas.

- **Spec:** `docs/specs/fase-0-monorepo.md` (pacote, pool, container); `docs/specs/fase-0-banco-e-rls.md` (schema, RLS, wrappers); `docs/specs/fase-0-permissoes.md` (catálogo de permissões)
- **Tabelas que possui:** fora do RLS, `tenants`, `users`, `sessions`, `accounts`, `verifications`, `memberships`, `permissions`, `user_platform_permissions`; dentro, `access_profiles`, `profile_permissions`, `profile_data_scopes`, `user_profiles`, `audit_log` — colunas de todas as fases em `docs/specs/modelo-de-dados.md`
- **Depende de:** `@crm/shared`

## Convenções locais

- Dois papéis do banco (`CONTEXT.md`): migrations rodam como `crm_owner` (`MIGRATION_DATABASE_URL`); a aplicação conecta como `crm_app` (`DATABASE_URL`). Nunca troque.
- Pool sempre por `createPool()`, limitado a 10 conexões — a instância de produção é compartilhada.
- A API recusa subir com papel que escapa do RLS (superusuário, `BYPASSRLS` ou dono de tabela, inclusive por herança): `assertApplicationRole(pool)` (`src/role-guard.ts`), chamada no boot de `apps/api/src/index.ts`. Os atributos e a posse de relação que `test/roles.integration.test.ts` prova no CI, valendo também no processo que está rodando; a posse de schema fica só no teste.
- Fora de `createDatabase`, só duas consultas tocam o banco, e nenhuma lê dado: `assertApplicationRole` no boot e `Database.ping()` (um `select 1`) no endpoint de saúde.
- `sql/public-schema.sql` é o estado do schema `public`, aplicado pelo init do container e pelo setup da integração. Grants por tabela vão na migration da tabela.
- A aplicação só fala com o banco por `createDatabase(pool)`: `withTenant(tenantId, fn)` para consulta de negócio, `semTenant(context, fn)` para os três casos nominais (login, CLI, super admin). Não exporte o Drizzle nem crie alias de `semTenant`. O contexto de CLI aceita `tenantId` opcional: é como o provisionamento escreve os dados da empresa na transação que a cria.
- Tabela de negócio usa `tenantId()` e `tenantIsolationPolicy()` de `src/schema/tenant-scope.ts`, e `id()`/`timestamps` de `src/schema/columns.ts`. O Drizzle não gera `FORCE ROW LEVEL SECURITY` nem grants: acrescente os dois à mão no fim da migration gerada, como em `migrations/0000_*.sql`.
- Tabela nova é tabela de negócio. A varredura (`test/schema-sweep.integration.test.ts`) falha o CI se ela não tiver `tenant_id`, a policy de isolamento — só ela — e FORCE; a exceção é a lista nominal de `test/support/schema-sweep.ts`, e entrar nela é decisão de revisão. Tabela de negócio nova também ganha uma linha em `createTenantWithBusinessData` (`test/support/fixtures.ts`) e em `BUSINESS_TABLES` do teste de isolamento.
- Escritas que precisam de histórico passam por `auditedWrites(tx, { tenantId, userId })` (`src/audit.ts`): `insert`/`update`/`delete` gravam uma linha de `audit_log` por campo alterado, na mesma transação; todas as linhas de uma instância (um envio) compartilham `change_id`. `userId` é `null` para CLI/sistema.
- `audit_log` é append-only (`crm_app` só tem INSERT e SELECT) e `permissions` é só leitura para a aplicação.
- A policy de `audit_log` é `tenantOrPlatformIsolationPolicy()`, não a das demais: linha de plataforma (`tenant_id` nulo) só se lê e se grava **sem** empresa ativa; com empresa, só as dela. A varredura exige esse predicado de quem está em `TABLES_WITH_NULLABLE_TENANT_ID`.
- `is_super_admin` só entra em linha de auditoria de plataforma: o wrapper a descarta (`PLATFORM_ONLY_FIELDS`) quando o autor tem empresa, para o histórico de uma empresa nunca revelar a flag.
- `permissions` espelha o catálogo de `@crm/shared` (`src/permissions.ts`): `runMigrations` roda `syncPermissionCatalog` depois das migrations. A sincronização insere e atualiza descrição, **nunca apaga** e **recusa mudar escopo** — as duas coisas são migration escrita à mão. Nenhuma migration pode depender de permissão do catálogo: num banco zerado, a sincronização ainda não rodou.
- Escopo de permissão é garantido pelo banco: o trigger `enforce_permission_scope` (`migrations/0005_*.sql`) recusa permissão `platform` em `profile_permissions` e `tenant` em `user_platform_permissions`.
- Gerar migration: `pnpm --filter @crm/db generate`. Aplicar: `pnpm db:migrate`.
- Teste de integração termina em `.integration.test.ts`; o setup (`test/support/global-setup.ts`) zera o banco `*_test` e aplica as migrations do zero.
