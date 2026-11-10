# contacts (front)

Lista, ficha e formulário de contatos.

- **Spec:** `docs/specs/fase-1-contatos.md`; issue #123
- **Depende de:** `@crm/shared`, `@crm/ui`, `src/listing`, `src/history`, `src/record-sections`, `src/shell`

## Convenções locais

- Rotas: `contacts`, `contacts/new`, `contacts/:id`, `contacts/:id/edit`; menu "Contatos" com `contatos.ver`.
- A ficha é `RecordSections` sobre `contactSections` (`contact-sections.tsx`): quem pendura algo na ficha registra a seção ali, sem editar a página. Dados e Histórico de alterações são as seções desta issue.
- O formulário usa `createContactSchema` de `@crm/shared`, o mesmo da API.
- Telefone e WhatsApp: `PhoneInput` guarda o texto digitado e o `createContactSchema` normaliza (`normalizePhone`). "WhatsApp é o mesmo número" é campo só do formulário (`sameNumber`, sem coluna): marcada em contato novo e, na edição, quando os dois valores são iguais; ao salvar, copia o telefone para o WhatsApp.
- Atalhos de contato (`ContactShortcuts`, de `@crm/ui`) na lista, no cartão do mobile e no cabeçalho da ficha: WhatsApp em `wa.me` (nova aba), `tel:` e `mailto:`.
