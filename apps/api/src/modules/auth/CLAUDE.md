# auth

Login, logout e sessão corrente: as únicas rotas sem empresa (`/auth/*`).

- **Spec:** `docs/specs/fase-0-autenticacao-e-contexto.md`
- **Tabelas que possui:** nenhuma — usa `users`, `sessions`, `accounts`, `verifications`, `tenants` e `memberships`, de `packages/db`
- **Depende de:** `@crm/db`, `@crm/shared`

## Convenções locais

- O Better Auth é usado por `auth.api`, **nunca montado como handler HTTP**: as rotas `/api/auth/*` da biblioteca (cadastro, organization…) não existem na API. Rota nova de autenticação é uma rota Hono em `routes.ts`, com schema Zod de `@crm/shared`.
- A biblioteca não recebe o Drizzle. `database-adapter.ts` abre uma transação `semTenant({ reason: 'login' })` por operação; um teste falha se a autenticação tocar o banco por outro caminho.
- `organization`/`member` são nomes da biblioteca e só aparecem em `auth.ts` e `database-adapter.ts`, mapeados para `tenants`/`memberships`. Fora daqui é sempre "empresa" e "vínculo".
- O plugin de organizations está mapeado só para leitura: `memberships` não tem `role` nem existe tabela de convite, então os endpoints de escrita dele não funcionam contra este schema — vínculo é criado por CLI.
- Usuário só sai daqui por `serializeUser` (`@crm/shared`). Nunca devolva `signIn.response.user` ou `session.user` crus.
- Credencial inválida responde sempre o mesmo 401, seja qual for o motivo.
- Login bem-sucedido grava `users.last_login_at` (`recordLogin`), sem mexer em `updated_at` e sem auditoria: é registro de acesso, não alteração de cadastro.
- Usuário de teste com senha: `createUserWithPassword` em `apps/api/test/support/fixtures.ts` — não há rota de cadastro.
