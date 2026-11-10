# contacts

Contatos da empresa ativa: pessoas físicas e jurídicas com papéis acumuláveis (comprador, proprietário, corretor externo).

- **Spec:** `docs/specs/fase-1-contatos.md`; issue #123 (cadastro mínimo ponta a ponta)
- **Tabelas que possui:** `contacts`, `contact_roles` (junção auditável, `CASCADE` do contato)
- **Depende de:** `@crm/db`, `@crm/shared`, `src/history`, `src/listing`

## Convenções locais

- Rotas sob `/e/:tenant/contacts`: `GET /`, `POST /`, `GET|PATCH /:id`, `GET /:id/history`. `contatos.ver|criar|editar` recusam com 403 antes do banco. Base compartilhada: a lista usa `withoutDataScope`, nenhuma rota aplica escopo.
- Contato, papéis e auditoria vão numa transação e num `auditedWrites` (um `change_id` por save). `roles` no `PATCH` substitui o conjunto (diferença: insere os novos, apaga os retirados); lista vazia é 400 pelo schema (`min(1)`).
- Razão social só existe em PJ: passar para PF a limpa; PF nunca a grava.
- O histórico declara `contact_roles` como filho (`nameColumn: 'role'`, mostrado pelo rótulo do enum: "Papel adicionado: Comprador").
- Documento (`tax_id`): o schema de `@crm/shared` normaliza e valida pelo tipo de pessoa (PF = CPF, PJ = CNPJ, numérico ou alfanumérico); o serviço confere de novo na edição, contra o cadastro. Duplicado na empresa é 409 com `existing: { id, name }` (pré-checagem; o índice único parcial `contacts_tenant_id_tax_id_unique` pega a corrida). Tipo incompatível é 400 com `field: 'taxId'`.
- Ainda sem API: telefones, classificação, origem do lead, `custom_fields`, `/options`, `/duplicates`, exclusão e semente — das issues seguintes da spec.
