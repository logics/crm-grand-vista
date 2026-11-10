# record-sections (front)

Seções registráveis de uma ficha: o mecanismo genérico que a ficha do contato usa e a da fazenda vai reaproveitar.

- **Spec:** `docs/specs/fase-1-contatos.md` (seção "Telas e componentes"); issue #123
- **Depende de:** `@crm/ui` (`Card`), `src/shell` (`useCan`)

## Convenções locais

- Cada módulo cria o seu registro com `createRecordSectionRegistry<Registro>()` e a página renderiza `<RecordSections registry record roles />`. Spec nova registra a seção no registro do módulo (`register`), sem editar a página.
- A seção declara `key` (única; repetida lança), `title`, `order`, condição opcional por `roles` (qualquer um dos papéis do registro) e/ou `permission` (cortesia: a API é quem recusa), e o `component`, que recebe o `record`.
- Fica fora de `packages/ui` porque depende da permissão efetiva da empresa, como a `ListPage`.
