# contacts

Contatos da empresa ativa: pessoas físicas e jurídicas com papéis acumuláveis (comprador, proprietário, corretor externo).

- **Spec:** `docs/specs/fase-1-contatos.md`; issue #123 (cadastro mínimo ponta a ponta)
- **Tabelas que possui:** `contacts`, `contact_roles` (junção auditável, `CASCADE` do contato)
- **Depende de:** `@crm/db`, `@crm/shared`, `src/history`, `src/listing`

## Convenções locais

- Rotas sob `/e/:tenant/contacts`: `GET /`, `POST /`, `GET|PATCH|DELETE /:id`, `GET /:id/history`. `contatos.ver|criar|editar|excluir` recusam com 403 antes do banco. Base compartilhada: a lista usa `withoutDataScope`, nenhuma rota aplica escopo.
- Contato, papéis e auditoria vão numa transação e num `auditedWrites` (um `change_id` por save). `roles` no `PATCH` substitui o conjunto (diferença: insere os novos, apaga os retirados); lista vazia é 400 pelo schema (`min(1)`).
- Razão social só existe em PJ: passar para PF a limpa; PF nunca a grava.
- O histórico declara `contact_roles` como filho (`nameColumn: 'role'`, mostrado pelo rótulo do enum: "Papel adicionado: Comprador").
- **Uso declarado** (`role-usage.ts`): `declareRoleUsage(papel, { table, column, label })` é o ponto de extensão; nasce vazio. A spec consumidora declara o seu uso no módulo que cria a tabela. Retirar papel com linhas declaradas é 409 (`RoleInUseError`, mensagem com contagem), antes de qualquer escrita.
- **Exclusão** apaga os papéis (auditados) e o contato; a FK `RESTRICT` das consumidoras vira 409 na rota (SQLSTATE 23001/23503), com o rótulo plural da declaração da tabela, senão o rótulo dos metadados de campo, senão o nome da tabela.
- **`ensureContactRole(tx, actor, contactId, role)`**: garantir papel, idempotente e auditada, na transação de quem chama (devolve se acrescentou).
- Ainda sem API: documento, telefones, classificação, origem do lead, `custom_fields`, `/options`, `/duplicates` e semente — das issues seguintes da spec.
