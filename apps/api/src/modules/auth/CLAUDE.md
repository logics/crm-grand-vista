# auth

Login, logout e sessão corrente: as únicas rotas sem empresa (`/auth/*`).

- **Spec:** `docs/specs/fase-0-autenticacao-e-contexto.md`
- **Tabelas que possui:** nenhuma — usa `users`, `sessions`, `accounts`, `verifications`, `tenants` e `memberships`, de `packages/db`
- **Depende de:** `@crm/db`, `@crm/shared`

## Convenções locais

- O Better Auth é usado por `auth.api`, **nunca montado como handler HTTP**: as rotas `/api/auth/*` da biblioteca (cadastro…) não existem na API. Rota nova de autenticação é uma rota Hono em `routes.ts`, com schema Zod de `@crm/shared`.
- A biblioteca não recebe o Drizzle. `database-adapter.ts` abre uma transação `semTenant({ reason: 'login' })` por operação; um teste falha se a autenticação tocar o banco por outro caminho.
- A biblioteca só conhece usuário, conta, sessão e verificação. Empresa e vínculo (`tenants`, `memberships`) ficam fora dela, sem plugin de organizations: a leitura é `listUserTenants`/`resolveTenantAccess`, e a escrita de vínculo é de um serviço próprio (CLI hoje; tela e convite na Fase 3). Ver ADR 0004.
- Usuário só sai daqui por `serializeUser` (`@crm/shared`). Nunca devolva `signIn.response.user` ou `session.user` crus.
- Credencial inválida responde sempre o mesmo 401, seja qual for o motivo.
- `POST /auth/login` tem limite de tentativas (`login-rate-limit.ts`): 5 falhas por e-mail a cada 15 min, depois 429 (`too_many_attempts`) igual para e-mail com ou sem conta, inclusive com a senha certa. O contador é em memória: some no restart e não é compartilhado entre instâncias — com mais de uma, migrar para o banco. Não há limite por IP (atrás de proxy o IP é o do proxy).
- Sessão se lê por `readSession` (`session.ts`), e a falta dela responde por `unauthenticated` — o mesmo 401 em `/auth/session` e em toda rota de empresa.
- `resolveTenantAccess` (`service.ts`) é a única consulta que transforma slug em empresa, e já decide o acesso: vínculo, ou super admin (que entra em qualquer empresa existente, sem vínculo). Empresa bloqueada recusa com 403 quem tem vínculo, e só depois de verificá-lo. Não existe resolver o slug sem essa decisão. Quem a usa é `src/tenant-context.ts`, o middleware de `/e/:tenant/`.
- Login bem-sucedido grava `users.last_login_at` (`recordLogin`), sem mexer em `updated_at` e sem auditoria: é registro de acesso, não alteração de cadastro.
- Usuário de teste com senha: `createUserWithPassword` em `apps/api/test/support/fixtures.ts` — não há rota de cadastro.
