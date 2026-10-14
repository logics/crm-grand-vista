# permissions

O que a aplicação precisa saber das permissões para se desenhar: o catálogo de escopo de empresa e a permissão efetiva do usuário na empresa ativa. O CRUD de perfis de acesso é da Fase 3.

- **Spec:** `docs/specs/fase-0-permissoes.md` ("Contratos de API")
- **Tabelas que possui:** nenhuma — lê `permissions`, de `packages/db`; o motor está em `src/authorization/`
- **Depende de:** `@crm/db`, `@crm/shared`

## Convenções locais

- `GET /e/:tenant/permissions` — catálogo de escopo de empresa (o que um perfil de acesso pode compor), lido do banco, atrás de `configuracoes.gerenciar`.
- `GET /e/:tenant/permissions/effective` — permissões efetivas e escopo de dados de **todo** módulo do catálogo, para o front esconder botão e item de menu. É cortesia, não controle: nenhuma decisão de autorização existe só no front.
- O super admin sai daqui como alguém que tem tudo, sem nada na resposta que diga por quê.
