# history

O histórico de alterações de um registro do lado do servidor: a leitura do `audit_log`, a montagem pronta para exibir e a fábrica da rota que cada módulo monta sob o próprio recurso. Não é módulo de negócio: não tem tabela, e a rota só existe montada por um módulo — a primeira é a de `users`.

- **Spec:** `docs/specs/fase-1-fundacao.md` (seções "Histórico de alterações" e "Contratos de API")
- **Tabelas que lê:** `audit_log` e `users` (nome do autor), de `packages/db`
- **Depende de:** `@crm/db`, `@crm/shared` (metadados de campo e o contrato `historyPageSchema`)

## Convenções locais

- O módulo monta a rota com `.route('/', createHistoryRoutes({ entity, access, isVisible }))` no próprio router: `access` é a declaração de acesso do detalhe (`requirePermission`/`noPermissionRequired`), e `isVisible(tx, c, id)` é a mesma verificação de visibilidade do detalhe, com o escopo de dados. Invisível, inexistente e id malformado são o mesmo 404. Nunca crie rota genérica `/history/:entity/:id`.
- `assemble.ts` é puro (sem I/O) e é onde moram as regras de exibição: uma entrada por `change_id`, mais nova primeiro (pela maior identity do save); título pelo gênero da entidade (cadastro, exclusão) ou do campo (um campo alterado), senão "N alterações"; campos na ordem do registro de metadados; coluna oculta ou fora do registro não aparece, e save sem campo visível some. Regra nova de exibição entra ali, com teste unitário em `test/history/assemble.test.ts`.
- Cadastro e exclusão são reconhecidos pela linha da coluna `id`, que o wrapper grava como valor novo no insert e como anterior no delete e que nunca muda num update.
- Autor pelo nome atual, sem recorte por vínculo; `user_id` nulo é "Sistema" (`SYSTEM_AUTHOR`). O super admin sai pelo nome, sem marcação.
- Paginação por cursor, `HISTORY_PAGE_SIZE` saves por página: o cursor é a maior identity do último save da página, codificada (`encodeCursor`) — por save, nunca por linha, então uma página nunca corta um save. Cursor que não decodifica é 400.
- O instante vai em ISO 8601 UTC; todo o resto vai formatado em pt-BR, pelos metadados de campo e o contexto de exibição.
- Ainda não implementados (próxima issue da spec): filhos declarados, resolução de referências, filtro de visibilidade por filho e jsonb expandido. Até lá, campo `reference` e `jsonb` não aparecem e `children` vem vazio.
