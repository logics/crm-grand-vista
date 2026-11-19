# record-sections (front)

Seções registráveis de uma ficha e as ações do cabeçalho dela: o mecanismo genérico das fichas de contato e de fazenda.

- **Spec:** `docs/specs/fase-1-contatos.md` (seção "Telas e componentes"); issue #123
- **Depende de:** `@crm/ui` (`Card`, `Button`), `src/shell` (`useCan`, `tenantPath`, `useTenantSlug`), `src/history` (`RecordHistoryButton`)

## Convenções locais

- Cada módulo cria o seu registro com `createRecordSectionRegistry<Registro>()` e a página renderiza `<RecordSections registry record roles />`. Spec nova registra a seção no registro do módulo (`register`), sem editar a página.
- A seção declara `key` (única; repetida lança), `title`, `order`, condição opcional por `roles` (qualquer um dos papéis do registro) e/ou `permission` (cortesia: a API é quem recusa), e o `component`, que recebe o `record`.
- Fica fora de `packages/ui` porque depende da permissão efetiva da empresa, como a `ListPage`.
- **Ações do cabeçalho:** toda ficha põe `<RecordPageActions history={…} editPath={canEdit ? '…/edit' : undefined} onDelete={canDelete ? abrirConfirmação : undefined} />` no `action` do `PageHeader`. Ordem fixa Histórico, Editar, Excluir; Histórico sempre aparece (quem vê o registro vê o histórico). A confirmação de exclusão e a mutação continuam na ficha, porque cada recurso tem a sua regra (a fazenda só exclui desativada). O histórico nunca é seção registrada (`record-history`).
