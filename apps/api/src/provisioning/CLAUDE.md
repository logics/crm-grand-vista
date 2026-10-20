# provisioning

O que os scripts de CLI fazem, separado de como são chamados: provisionar empresa, cadastrar usuário em empresa existente, criar/marcar/desmarcar super admin e redefinir senha. Os executáveis (`src/cli/`) só leem argumentos, perguntam e imprimem; a regra mora aqui e é testada em `apps/api/test/provisioning/`.

- **Spec:** `docs/specs/fase-0-autenticacao-e-contexto.md` ("Scripts de CLI"); `docs/specs/fase-0-permissoes.md` ("Perfis de acesso semeados")
- **Tabelas que possui:** nenhuma — escreve em `tenants`, `users`, `accounts`, `memberships`, `access_profiles`, `profile_permissions`, `profile_data_scopes`, `user_profiles`, `sessions` e `audit_log`, de `packages/db`
- **Depende de:** `@crm/db`, `@crm/shared`

## Convenções locais

- Tudo pelo caminho `semTenant({ reason: 'cli' })`, com autor nulo no `auditedWrites`. O provisionamento gera o id da empresa antes e o passa como `tenantId` do contexto de CLI: os perfis de acesso estão sob RLS e nascem na mesma transação que a empresa — ou ela nasce inteira, ou não nasce.
- Provisionar recusa slug existente e e-mail existente **antes** de escrever, com `ProvisioningError`; nada é gravado. Slug e nome são validados pelos schemas de `@crm/shared` (`tenantSlugSchema`), os mesmos da futura tela de gestão de empresas.
- Os perfis de acesso semeados (`seeded-access-profiles.ts`) são regras sobre o catálogo **do banco**, não listas: permissão de empresa nova entra no Admin e no Gestor sem migration de perfil. Só o Corretor é lista fechada. `is_seeded` é informativo — a empresa edita e apaga os três.
- A credencial (`accounts`) é gravada fora do wrapper de auditoria: o hash da senha não vai para o log. A senha inicial é gerada e devolvida uma vez, para o CLI mostrar.
- A marcação de super admin é auditoria **de plataforma** (`tenant_id` nulo), que nenhuma transação de empresa lê. `super-admin.ts` não tem nem terá função que liste quem tem a flag.
- `user.ts` (`createUser`) resolve o slug numa leitura à parte para abrir a transação já com a empresa ativa (perfis estão sob RLS) e revalida dentro dela. E-mail existente ganha só o vínculo (senha mantida, `password: null` no retorno); o primeiro vínculo é o padrão. `createSuperAdmin` cria sem vínculo e a recusa de e-mail existente não revela a flag.
- `password.ts` troca a credencial e apaga as sessões na mesma transação; a auditoria é uma linha de plataforma `users.password = 'redefinida'`, escrita à mão — nunca o valor nem o hash. A senha vem de `credentials.ts`, comum aos comandos.
- Os CLIs de super admin e de redefinição exigem terminal interativo e a confirmação digitando de novo o e-mail.

## Uso

```
pnpm tenant:provision --slug grand-vista --name "Grand Vista" --admin-name "Ana Souza" --admin-email ana@grandvista.com.br
pnpm super-admin grant <e-mail>
pnpm super-admin revoke <e-mail>
pnpm super-admin create --name "Nome" --email <e-mail>
pnpm user:create --name "Bia" --email bia@grandvista.com.br --tenant grand-vista --profile Corretor
pnpm user:reset-password <e-mail>
```

Todos leem só `DATABASE_URL` (papel `crm_app`) do `.env`.
