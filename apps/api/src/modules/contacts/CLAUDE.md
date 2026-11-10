# contacts

Contatos da empresa ativa: pessoas físicas e jurídicas com papéis acumuláveis (comprador, proprietário, corretor externo).

- **Spec:** `docs/specs/fase-1-contatos.md`; issues #123 (cadastro mínimo ponta a ponta), #126 (classificação, origem do lead, semente) e #129 (avisos de duplicata)
- **Tabelas que possui:** `contacts`, `contact_roles` (junção auditável, `CASCADE` do contato)
- **Depende de:** `@crm/db`, `@crm/shared`, `src/history`, `src/listing`

## Convenções locais

- Rotas sob `/e/:tenant/contacts`: `GET /`, `POST /`, `GET|PATCH /:id`, `GET /:id/history`. `contatos.ver|criar|editar` recusam com 403 antes do banco. Base compartilhada: a lista usa `withoutDataScope`, nenhuma rota aplica escopo.
- Contato, papéis e auditoria vão numa transação e num `auditedWrites` (um `change_id` por save). `roles` no `PATCH` substitui o conjunto (diferença: insere os novos, apaga os retirados); lista vazia é 400 pelo schema (`min(1)`).
- Razão social só existe em PJ: passar para PF a limpa; PF nunca a grava.
- O histórico declara `contact_roles` como filho (`nameColumn: 'role'`, mostrado pelo rótulo do enum: "Papel adicionado: Comprador").
- Classificação do cliente (`classification_id`) é dado do papel comprador: informá-la sem o papel é 400 (no schema de criação e, na edição, no serviço, que olha o conjunto final de papéis). Retirar o comprador apaga a classificação no mesmo save, e o histórico guarda o valor anterior. Classificação e origem do lead (`lead_source_id`) têm de existir na empresa (FK não passa pelo RLS), senão 400. O serviço devolve `{ rejected }` para recusas de regra; a rota as traduz em 400.
- Documento (`tax_id`): o schema de `@crm/shared` normaliza e valida pelo tipo de pessoa (PF = CPF, PJ = CNPJ, numérico ou alfanumérico); o serviço confere de novo na edição, contra o cadastro. Duplicado na empresa é 409 com `existing: { id, name }` (pré-checagem; o índice único parcial `contacts_tenant_id_tax_id_unique` pega a corrida). Tipo incompatível é 400 com `field: 'taxId'`.
- Ainda sem API: telefones, `custom_fields`, `/options` e exclusão — das issues seguintes da spec.
- `GET /duplicates` (`contatos.ver`): coincidência por telefone/WhatsApp (cruzados), e-mail e nome sem caixa nem acento (`lower(unaccent())`), com os `reasons`; `excludeId` tira o próprio contato; telefone passa por `normalizePhone`. Registrada antes de `/:id`. É aviso, nunca bloqueio.
