# contacts (front)

Lista, ficha e formulário de contatos.

- **Spec:** `docs/specs/fase-1-contatos.md`; issue #123
- **Depende de:** `@crm/shared`, `@crm/ui`, `src/listing`, `src/history`, `src/record-sections`, `src/shell`

## Convenções locais

- Rotas: `contacts`, `contacts/new`, `contacts/:id`, `contacts/:id/edit`; menu "Contatos" com `contatos.ver`.
- A ficha é `RecordSections` sobre `contactSections` (`contact-sections.tsx`): quem pendura algo na ficha registra a seção ali, sem editar a página. Dados e Histórico de alterações são as seções desta issue.
- O formulário usa `createContactSchema` de `@crm/shared`, o mesmo da API.
