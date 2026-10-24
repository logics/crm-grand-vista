# listing

O padrão de listagem do lado do servidor: a consulta paginada que toda listagem de módulo usa. Não é módulo de negócio: não tem rota nem tabela — a primeira lista real é de `fase-1-configuracoes`.

- **Spec:** `docs/specs/fase-1-fundacao.md` (seção "Padrão de listagem")
- **Depende de:** `@crm/db` (extensão `unaccent`, `migrations/0007_*.sql`), `@crm/shared` (`listQuerySchema`)

## Convenções locais

- A rota valida a query por `listQuerySchema({ sortable, filters })` de `@crm/shared` — o mesmo schema que o front usa na URL. `pageSize` fora de 25/50/100 e `sort` fora dos declarados são 400.
- O módulo declara a lista uma vez com `defineList({ table, sortable, defaultSort, searchable })`; as chaves de `sortable` são as mesmas do schema da rota — campo que o schema aceita e a lista não declara é erro de tipo em `paginatedQuery`, não 500. `id` não é ordenável por parâmetro: `listOrderBy` o põe sempre no fim, como desempate.
- A consulta é `paginatedQuery(tx, list, query, { scope, filters })`, que devolve `{ items, total, page, pageSize }`. `scope` é obrigatório e entra **também no total**: `dataScopeClause(...)` para lista com corretor responsável, `withoutDataScope` para a que não tem — os dois de `src/authorization/data-scope.ts` —, nunca omitido.
- Os filtros do módulo entram como predicados em `filters`; a busca `q` é do helper (`unaccent` + `ILIKE`, curingas escapados) e só procura nas colunas de texto de `searchable` (o tipo recusa outra).
- Página além do fim volta com `items` vazio e o `total` verdadeiro; não é erro.
