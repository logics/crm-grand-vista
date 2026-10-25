# history (front)

O histórico de alterações de um registro do lado do front: o componente que toda ficha usa para mostrar o histórico dela. Contrapartida de `apps/api/src/history`. Não é módulo de negócio — a primeira ficha que o usa é de `fase-1-configuracoes`.

- **Spec:** `docs/specs/fase-1-fundacao.md` (seções "Histórico de alterações", "Contratos de API" e "Telas e componentes")
- **Depende de:** `@crm/shared` (`historyPageSchema`), `@crm/ui` (`AuditTimeline`), `src/shell` (`useTenantInfiniteQuery`, `ResourceNotFoundError`, `page-state`), `src/lib/instant.ts`

## Convenções locais

- A ficha monta `<RecordHistory queryKey={['farms', id]} fetchPage={(slug, cursor) => api.e[':tenant'].farms[':id'].history.$get({ param: { tenant: slug, id }, query: { cursor } })} />`: o módulo só dá a chave do registro e a chamada RPC da rota do próprio recurso. Ler a resposta (404 → `ResourceNotFoundError`, falha → erro, 200 → `historyPageSchema`), paginar pelo cursor, carregando, vazio e erro são do componente — não os refaça no módulo.
- A API entrega tudo formatado, menos o instante: ele sai por `formatInstant` (`src/lib/instant.ts`), no fuso do navegador ("24/07 · 14h30"). Não formate data de outro jeito, nem guarde o formatador — guardado, ele fixaria o fuso.
- A entrada de cadastro nasce com os valores iniciais recolhidos ("Ver valores iniciais"); as demais, abertas. Filhos do save (`children`) vão para `related` da `AuditTimeline`, cada um numa linha própria. O truncamento do texto longo é da `AuditTimeline`.
- "Carregar mais" só aparece com `nextCursor`; falha ao carregar mais mantém as entradas e o botão, com o erro embaixo.
- Teste do componente monta as rotas de produção (`renderApp`) e troca só o `fetch` (`test/support/fake-api.ts`): a página por cursor é um registro com a query no caminho (`/e/gv/users/1/history?cursor=c2`), e falha ou resposta que demora são uma `FakeResponse`. O fuso do navegador é o `TZ` do processo (`vi.stubEnv('TZ', 'America/Cuiaba')`).
