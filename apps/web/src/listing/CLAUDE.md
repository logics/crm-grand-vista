# listing (front)

O padrão de listagem do lado do front: o estado da lista na URL e a página de lista que todo módulo usa. Contrapartida de `apps/api/src/listing`. Não é módulo de negócio — a primeira lista real é de `fase-1-configuracoes`.

- **Spec:** `docs/specs/fase-1-fundacao.md` (seções "Padrão de listagem" e "Telas e componentes")
- **Depende de:** `@crm/shared` (`listQuerySchema`, `ListPage`), `@crm/ui` (`SearchBar`, `DataTable`, `Pagination`), `src/shell` (`useTenantQuery`, `page-state`)

## Convenções locais

- Página, tamanho, ordenação, busca e filtros vivem na URL, nunca em `useState`. Quem lê e escreve é `useListQuery(schema)` (`list-query.ts`), com o **mesmo** `listQuerySchema({ sortable, filters })` da rota da API — declare-o uma vez, em `@crm/shared`, e importe dos dois lados.
- Parâmetro inválido na URL cai no padrão sozinho (os válidos continuam); escrever a lista limpa o inválido e omite o que está no padrão. Toda troca é uma entrada do histórico; trocar busca, filtro, ordenação ou tamanho volta à página 1.
- A tela de lista é `<ListPage>` (`list-page.tsx`): o módulo dá `schema`, `queryKey`, `fetchPage(slug, query)`, as colunas (`sortable` nas que o schema ordena, com `key` igual ao campo), o cartão do mobile (`renderCard`), o vazio sem filtro e os filtros como `children(list)`, que leem `list.query` e escrevem por `list.update`. Ordenação, paginação, carregando, erro, "nenhum resultado" e a página além do fim são dela — não os refaça no módulo.
- Filtros são escritos à mão por módulo, não gerados dos metadados de campo.
- A `ListPage` não vai para `packages/ui`: depende do roteador e do TanStack Query.
