# authorization

O motor de autorização: a segunda e a terceira das quatro camadas — permissão (middleware de rota) e escopo de dados (cláusula por módulo). Não é módulo de negócio: não tem rota nem tabela; as rotas que expõem permissões estão em `src/modules/permissions`.

- **Spec:** `docs/specs/fase-0-permissoes.md`
- **Tabelas que lê:** `user_profiles`, `profile_permissions`, `profile_data_scopes`, de `packages/db`
- **Depende de:** `@crm/db`, `@crm/shared`

## Convenções locais

- **Toda rota declara acesso**, e uma vez só: `requirePermission('<modulo>.<acao>')` ou `noPermissionRequired`, como middleware da própria rota. `createApp` roda `assertRouteAccess` e **não cria o app** com rota que não declare, que declare duas vezes, ou que seja de negócio fora de `/e/:tenant/`. A prova está em `apps/api/test/authorization/route-access.test.ts`.
- `noPermissionRequired` é o "marcador de rota pública" da spec, com nome que não engana: **não dispensa login**. Sob `/e/:tenant/` a rota ainda exige sessão e vínculo — só não pede permissão do catálogo. Fora de `/e/:tenant/`, só as rotas de `ROUTES_WITHOUT_TENANT` (saúde e autenticação); entrar nessa lista é decisão de revisão.
- Ação que vale sem a permissão sobre o que é do próprio usuário é declarada na rota com `unless` (`requirePermission('usuarios.gerenciar', { unless })`), nunca como condicional no handler.
- A permissão efetiva é resolvida em `src/tenant-context.ts`, uma vez por requisição, e fica em `c.var.access`. Nunca a guarde na sessão: revogar um perfil de acesso vale na requisição seguinte.
- O curto-circuito do super admin mora **só** em `resolveEffectiveAccess` (`service.ts`): ele recebe `unrestrictedAccess`. Nenhuma rota lê a flag; `test/no-super-admin-flag.test.ts` (raiz) trava a lista de arquivos que a nomeiam.
- União sem subtração: `buildEffectiveAccess` junta as permissões de todos os perfis e, por módulo, fica com o escopo mais amplo (`all` vence `own`). Módulo que nenhum perfil declara vale `own`.
- Falha de permissão é **403**. Falha de escopo de dados é **404**: aplique `dataScopeClause(c.var.access, '<modulo>', <coluna do corretor responsável>)` no `where` da listagem **e** do detalhe — a mesma função nos dois. "Próprio" é ser o corretor responsável, não ter o perfil de acesso Corretor.
- A prova de integração do escopo (404 por ID direto) é critério de aceite da spec de Fazendas, o primeiro módulo com corretor responsável; aqui ela é unitária (`test/authorization/data-scope.test.ts`).
