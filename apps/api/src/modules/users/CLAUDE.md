# users

Usuários da empresa ativa: listagem de equipe (que também alimenta o seletor de responsável) e atualização de usuário.

- **Spec:** `docs/specs/fase-0-autenticacao-e-contexto.md` (seção "Super admin")
- **Tabelas que possui:** nenhuma — usa `users`, `memberships`, `user_profiles` e `access_profiles`, de `packages/db`
- **Depende de:** `@crm/db`, `@crm/shared`

## Convenções locais

- Ainda **não há `routes.ts`**: as rotas são de empresa (`/e/:empresa/...`) e dependem do middleware de resolução (#8) e do de permissão (#11). O serviço recebe a transação de `withTenant()` já aberta.
- `users` e `memberships` ficam fora do RLS: todo recorte por empresa aqui é explícito, pelo vínculo (`membersOf`). Consulta nova a `users` sem esse recorte atravessa empresas.
- Nada sai cru: `listTeamMembers` devolve `serializeTeamMember`, `updateUser` devolve `serializeUser`. O super admin aparece como qualquer usuário, com os perfis de acesso de fato vinculados — sem perfil, lista vazia.
- `updateUser` passa o corpo de novo por `updateUserSchema`, mesmo já validado na borda: é o que garante que `is_super_admin` não chega ao banco por nenhum chamador. A escrita vai por `auditedWrites`.
- Este módulo não nomeia a flag: `test/no-super-admin-flag.test.ts` (raiz) falha se a API, o front ou `packages/shared` a citarem em código.
- Rota nova, aqui ou em qualquer módulo, ganha uma amostra em `apps/api/test/response-sweep.integration.test.ts` — a varredura que procura a flag em toda resposta falha enquanto ela não tiver.
