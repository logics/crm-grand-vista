# contacts

Contatos da empresa ativa: pessoas físicas e jurídicas com papéis acumuláveis (comprador, proprietário, corretor externo).

- **Spec:** `docs/specs/fase-1-contatos.md`; issues #123 (cadastro mínimo ponta a ponta) e #126 (classificação, origem do lead, semente)
- **Tabelas que possui:** `contacts`, `contact_roles` (junção auditável, `CASCADE` do contato)
- **Depende de:** `@crm/db`, `@crm/shared`, `src/history`, `src/listing`

## Convenções locais

- Rotas sob `/e/:tenant/contacts`: `GET /`, `POST /`, `GET|PATCH|DELETE /:id`, `GET /:id/history`. `contatos.ver|criar|editar|excluir` recusam com 403 antes do banco. Base compartilhada: a lista usa `withoutDataScope`, nenhuma rota aplica escopo.
- Contato, papéis e auditoria vão numa transação e num `auditedWrites` (um `change_id` por save). `roles` no `PATCH` substitui o conjunto (diferença: insere os novos, apaga os retirados); lista vazia é 400 pelo schema (`min(1)`).
- Razão social só existe em PJ: passar para PF a limpa; PF nunca a grava.
- O histórico declara `contact_roles` como filho (`nameColumn: 'role'`, mostrado pelo rótulo do enum: "Papel adicionado: Comprador").
- Classificação do cliente (`classification_id`) é dado do papel comprador: informá-la sem o papel é 400 (no schema de criação e, na edição, no serviço, que olha o conjunto final de papéis). Retirar o comprador apaga a classificação no mesmo save, e o histórico guarda o valor anterior. Classificação e origem do lead (`lead_source_id`) têm de existir na empresa (FK não passa pelo RLS), senão 400. O serviço devolve `{ rejected }` para recusas de regra; a rota as traduz em 400.
- Documento (`tax_id`): o schema de `@crm/shared` normaliza e valida pelo tipo de pessoa (PF = CPF, PJ = CNPJ, numérico ou alfanumérico); o serviço confere de novo na edição, contra o cadastro. Duplicado na empresa é 409 com `existing: { id, name }` (pré-checagem; o índice único parcial `contacts_tenant_id_tax_id_unique` pega a corrida). Tipo incompatível é 400 com `field: 'taxId'`.
- **Uso declarado** (`role-usage.ts`): `declareRoleUsage(papel, { table, column, label })` é o ponto de extensão; nasce vazio. A spec consumidora declara o seu uso no módulo que cria a tabela. Retirar papel com linhas declaradas é 409 (`RoleInUseError`, mensagem com contagem), antes de qualquer escrita.
- **Exclusão** apaga os papéis (auditados) e o contato; a FK `RESTRICT` das consumidoras vira 409 na rota (SQLSTATE 23001/23503), com o rótulo plural da declaração da tabela, senão o rótulo dos metadados de campo, senão o nome da tabela.
- **`ensureContactRole(tx, actor, contactId, role)`**: garantir papel, idempotente e auditada, na transação de quem chama (devolve se acrescentou).
- Ainda sem API: `custom_fields`, `/options` e `/duplicates` — das issues seguintes da spec.
