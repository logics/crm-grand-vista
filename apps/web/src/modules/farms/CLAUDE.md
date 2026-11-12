# farms (front)

Lista, ficha e formulário de fazendas (cadastro mínimo, issue #145).

- **Spec:** `docs/specs/fase-1-fazendas.md`
- **Depende de:** `@crm/shared`, `@crm/ui`, `src/listing`, `src/history`, `src/record-sections`, `src/shell`, `modules/settings` (`VocabularyField`, sugestão de praça, contexto de exibição de área), `modules/municipalities`, `modules/users`

## Convenções locais

- Rotas: `farms`, `farms/new`, `farms/:id`, `farms/:id/edit`; menu "Fazendas" com `fazendas.ver`.
- A ficha é `RecordSections` sobre `farmSections` (`farm-sections.tsx`), o mesmo mecanismo da ficha do contato: quem pendura algo registra a seção ali. Dados e Histórico de alterações são as desta issue.
- Formulário: `createFarmSchema` de `@crm/shared`, o mesmo da API; seções Identificação e Áreas. Área pelo `AreaInput` na unidade da empresa, entregando hectares. Na edição só vai ao `PATCH` o que mudou — a área não editada não é reenviada, para a exibição em alqueire não gerar deriva nem histórico.
- Praça: sugerida pelo município (`fetchTradingPostSuggestion`) só enquanto a pessoa não a escolheu à mão nesta edição.
- Corretor responsável: com escopo `own` (`useDataScope('fazendas')`) o campo é somente leitura no próprio usuário; com `all`, `UserField` (equipe da empresa).

## Proprietários (issue #148)

- `farm-owners-field.tsx`: lista de `ContactField` (papel `owner`) com marca de principal e retirar. O primeiro incluído vira principal; retirar o principal promove o próximo. Sem `contatos.ver` o seletor é somente leitura e não se inclui ninguém; retirar e trocar o principal continuam possíveis.
- O formulário só envia `owners` se o conjunto ou o principal mudou.
- `contact-farms-section.tsx` registra a seção "Fazendas" da ficha do contato (papel `owner` + `fazendas.ver`), importada por efeito em `routes.tsx`.
- A lista mostra o proprietário principal com "+N" (`primaryOwnerLabel`).
