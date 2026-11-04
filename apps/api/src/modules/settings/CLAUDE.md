# settings

Configurações da empresa. O motor de cadastros auxiliares (alfabéticos e de ordem manual, com ou sem significado de sistema).

- **Spec:** `docs/specs/fase-1-configuracoes.md`; issue #102
- **Tabelas que possui:** os cadastros do registro (a forma comum de `packages/db/src/schema/vocabulary.ts`), mais `trading_post_municipalities` (campo extra da praça, FK `CASCADE`); `commercial_statuses` soma `system_meaning` com CHECK
- **Depende de:** `@crm/db`, `@crm/shared` (registro `VOCABULARIES`)

## Convenções locais

- Rotas sob `/e/:tenant/settings/vocabularies`: `GET /` (menu), `GET|POST /:vocabulary`, `PATCH|DELETE /:vocabulary/:id`, `GET /:vocabulary/options`. Todas exigem `configuracoes.gerenciar`, exceto `/options` (403 antes de tudo); chave fora do registro é 404 (`resolveVocabulary`), antes da validação do corpo.
- Cadastro novo = entrada em `VOCABULARIES` (`packages/shared/src/vocabulary.ts`) + tabela com `vocabularyColumns()` + migration + uma linha em `TABLES` (`service.ts`, que o compilador exige) + metadados de campo. Rota e tela não mudam.
- Nome repetido (sem caixa nem acento, pelo índice sobre `normalize_vocabulary_name`) é 409; a pré-checagem escolhe a mensagem da entrada inativa, e o índice cobre a corrida. Entrada em uso é 409 vindo da FK `RESTRICT` (SQLSTATE 23001; 23503 para `NO ACTION`): a rota traduz, o serviço não pré-consulta consumidores.
- A ordem alfabética usa `collate "pt-BR-x-icu"` na ordenação da lista (`sortable` aceita expressão SQL).
- Escritas passam por `auditedWrites`.
- `GET /:vocabulary/options` (`?q&cursor&limit&includeInactive&ids`) não exige permissão (`noPermissionRequired`): basta o vínculo. Ordem: ativas, depois inativas, cada grupo pt-BR; cursor é o deslocamento, com desempate por `id`. `ids` hidrata o valor gravado, ativo ou não, e ignora busca e `includeInactive`. O seletor do front é o `VocabularyPicker` (`packages/ui`).
- **Ordem manual** (`orderMode: 'manual'`, ex.: status comercial): lista, opções e `/defaults` ordenam por `display_order` e depois nome; a listagem não pagina. Entrada nova entra no fim (`max + 1`) e `maxEntries` do registro limita o cadastro (409); criação e limite serializam por `pg_advisory_xact_lock` por empresa e cadastro.
- **Significado de sistema** (`systemMeaning` no registro): obrigatório no `POST` (de lista fechada) e proibido em cadastro que não o tem; `PATCH` com `systemMeaning` é 400 (`z.never`). Desativar ou excluir a última ativa de um significado é 409 (`guardLastActiveMeaning`, que trava as ativas do significado).
- `GET /:vocabulary/defaults` (`noPermissionRequired`): `{ [significado]: { id, name } | null }`, a primeira ativa na ordem do cadastro; `{}` em cadastro sem significado.
- `PUT /:vocabulary/order` (`{ ids }`, 204): só cadastro manual (alfabético é 400). A lista tem de ser exatamente a das entradas, cada uma uma vez, senão 400 sem gravar. Regrava, sob o lock do cadastro e num só `auditedWrites` (um `change_id`), o `display_order` só das linhas que mudaram.
- **Praça e municípios atendidos** (`servedMunicipalities` no registro; `trading-post-municipalities.ts`): `POST`/`PATCH` aceitam `municipalities` (códigos IBGE; ausente no PATCH preserva, lista substitui) e gravam com o nome num save só, pelo mesmo `auditedWrites`. A checagem (código inexistente é 400; município de outra praça é 409 nomeando-a) roda **antes** de gravar a entrada, porque a recusa é resultado e não exceção; a corrida cai no UNIQUE (409). Praça inativa mantém os municípios. Excluir a praça remove os municípios pelo wrapper antes do CASCADE, para auditar. Respostas de lista, `POST` e `PATCH` trazem `municipalities`; `/options` não.
- `GET /trading-posts/suggestion?municipality=<ibge>` (`noPermissionRequired`): a praça ativa que atende o município, ou `null`.
- **Parâmetros** (`parameters.ts`, `tenant_settings`): `GET /` (`noPermissionRequired`) e `PATCH /` (`configuracoes.gerenciar`, só valores do CHECK, corpo vazio ou com chave estranha é 400). Sem a linha valem os defaults; o primeiro `PATCH` a cria (upsert por `auditedWrites`). A tabela tem `id` próprio, além do `tenant_id` UNIQUE, porque o wrapper de auditoria identifica o registro por `id`. `readHistory` (`src/history`) lê os parâmetros e os passa como contexto de exibição de área.
- Fora do que existe, ainda por fazer: semente.
