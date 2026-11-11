# contacts

Contatos da empresa ativa: pessoas físicas e jurídicas com papéis acumuláveis (comprador, proprietário, corretor externo).

- **Spec:** `docs/specs/fase-1-contatos.md`; issues #123 (cadastro mínimo ponta a ponta), #126 (classificação, origem do lead, semente), #129 (avisos de duplicata), #128 (busca, filtros e colunas da lista) e #130 (opções do seletor)
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
- Lista (`GET /`): `q` soma às colunas de texto (nome, razão social, documento, e-mail; `unaccent` + `ILIKE`) o documento pelo termo normalizado e telefone/WhatsApp pelos dígitos (`regexp_replace(…,'\D','')`), esta só quando o termo não tem letra ("Fazenda 2" não vira busca de telefone). Filtros `role` (lista separada por vírgula, qualquer um dos papéis, `EXISTS` em `contact_roles`), `personType`, `classificationId`, `leadSourceId`, `createdFrom`/`createdTo` (dias inclusivos, no fuso de Brasília). Schema único em `@crm/shared` (`contactListQuerySchema`), o mesmo da URL do front. Ordenação por nome (collation pt-BR) ou `createdAt`, sempre terminada em `id` crescente.
- `GET /duplicates` (`contatos.ver`): coincidência por telefone/WhatsApp (cruzados), e-mail e nome sem caixa nem acento (`lower(unaccent())`), com os `reasons`; `excludeId` tira o próprio contato; telefone passa por `normalizePhone`. Registrada antes de `/:id`. É aviso, nunca bloqueio.
- `GET /options` (`options.ts`, declarada `noPermissionRequired` e checada na rota): `role` **ordena** (quem tem o papel, depois os demais, cada grupo por nome e `id`), não filtra; `q` busca em nome, razão social, e-mail, documento e telefone/WhatsApp pelos dígitos; cursor = deslocamento. `ids` hidrata qualquer vínculo; sem `contatos.ver` devolve só `id` e `name` (`personType` e `taxId` nulos, `roles` vazio) e a busca por termo é 403 antes do banco. Registrada antes de `/:id`.
- Ainda sem API: `custom_fields` — de issue seguinte da spec.
