# settings

Configurações da empresa. Por ora, o motor de cadastros auxiliares, provado com Culturas.

- **Spec:** `docs/specs/fase-1-configuracoes.md`; issue #102
- **Tabelas que possui:** `crops` (a forma comum de `packages/db/src/schema/vocabulary.ts`)
- **Depende de:** `@crm/db`, `@crm/shared` (registro `VOCABULARIES`)

## Convenções locais

- Rotas sob `/e/:tenant/settings/vocabularies`: `GET /` (menu), `GET|POST /:vocabulary`, `PATCH|DELETE /:vocabulary/:id`, `GET /:vocabulary/options`. Todas exigem `configuracoes.gerenciar`, exceto `/options` (403 antes de tudo); chave fora do registro é 404 (`resolveVocabulary`), antes da validação do corpo.
- Cadastro novo = entrada em `VOCABULARIES` (`packages/shared/src/vocabulary.ts`) + tabela com `vocabularyColumns()` + migration + uma linha em `TABLES` (`service.ts`, que o compilador exige) + metadados de campo. Rota e tela não mudam.
- Nome repetido (sem caixa nem acento, pelo índice sobre `normalize_vocabulary_name`) é 409; a pré-checagem escolhe a mensagem da entrada inativa, e o índice cobre a corrida. Entrada em uso é 409 vindo da FK `RESTRICT` (SQLSTATE 23001; 23503 para `NO ACTION`): a rota traduz, o serviço não pré-consulta consumidores.
- A ordem alfabética usa `collate "pt-BR-x-icu"` na ordenação da lista (`sortable` aceita expressão SQL).
- Escritas passam por `auditedWrites`.
- `GET /:vocabulary/options` (`?q&cursor&limit&includeInactive&ids`) não exige permissão (`noPermissionRequired`): basta o vínculo. Ordem: ativas, depois inativas, cada grupo pt-BR; cursor é o deslocamento, com desempate por `id`. `ids` hidrata o valor gravado, ativo ou não, e ignora busca e `includeInactive`. O seletor do front é o `VocabularyPicker` (`packages/ui`).
- Fora desta issue, ainda por fazer: ordem manual, significado de sistema, campos extras, `/defaults`, parâmetros, semente.
