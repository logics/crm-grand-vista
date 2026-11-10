# contacts (front)

Lista, ficha e formulário de contatos.

- **Spec:** `docs/specs/fase-1-contatos.md`; issues #123 e #126
- **Depende de:** `@crm/shared`, `@crm/ui`, `src/listing`, `src/history`, `src/record-sections`, `src/shell`, `modules/settings` (só `VocabularyField` e `resolveVocabularyOptions`, o ponto de consumo dos cadastros auxiliares)

## Convenções locais

- Rotas: `contacts`, `contacts/new`, `contacts/:id`, `contacts/:id/edit`; menu "Contatos" com `contatos.ver`.
- A ficha é `RecordSections` sobre `contactSections` (`contact-sections.tsx`): quem pendura algo na ficha registra a seção ali, sem editar a página. Dados e Histórico de alterações são as seções desta issue.
- O formulário usa `createContactSchema` de `@crm/shared`, o mesmo da API.
- Classificação do cliente só aparece no formulário e na ficha com o papel comprador (`VocabularyField`); a origem do lead, sempre. Desmarcar o comprador com classificação preenchida abre o `ConfirmDialog` dizendo o que será apagado; ao confirmar, o campo é limpo e o `PATCH` leva `classificationId: null`. A ficha resolve os nomes por id nos endpoints de opções dos cadastros.
- Documento: `TaxIdInput` (máscara pelo tipo de pessoa); o 409 vira `TaxIdTakenError` em `contacts-api.ts` e o formulário mostra o link "Abrir o cadastro de …" sob o campo, sem limpar o digitado. A lista mostra o documento abreviado (`abbreviateTaxId`).
- Telefone e WhatsApp: `PhoneInput` formata ao digitar (máscara `maskPhoneInput`, teto de 11 dígitos no Brasil e 15 no internacional), guarda o texto mascarado e o `createContactSchema` normaliza (`normalizePhone`). "WhatsApp é o mesmo número" é campo só do formulário (`sameNumber`, sem coluna): marcada em contato novo e, na edição, quando os dois valores são iguais; ao salvar, copia o telefone para o WhatsApp.
- Atalhos de contato (`ContactShortcuts`, de `@crm/ui`) na lista, no cartão do mobile e no cabeçalho da ficha: WhatsApp em `wa.me` (nova aba), `tel:` e `mailto:`.
