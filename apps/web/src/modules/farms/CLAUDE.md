# farms (front)

Lista, ficha e formulário de fazendas (cadastro mínimo, #145; técnico e comercial, #147).

- **Spec:** `docs/specs/fase-1-fazendas.md`
- **Depende de:** `@crm/shared`, `@crm/ui`, `src/listing`, `src/history`, `src/record-sections`, `src/shell`, `modules/settings` (`VocabularyField`, sugestão de praça, contexto de exibição de área), `modules/municipalities`, `modules/users`

## Convenções locais

- Rotas: `farms`, `farms/new`, `farms/:id`, `farms/:id/edit`; menu "Fazendas" com `fazendas.ver`.
- A ficha é `RecordSections` sobre `farmSections` (`farm-sections.tsx`), o mesmo mecanismo da ficha do contato: quem pendura algo registra a seção ali. Dados e Histórico de alterações são as desta issue.
- Formulário de uma página, em seções ancoradas (`identificacao`, `areas`, `comercial`, `tecnico`; índice de âncoras no topo): `farmFormSchema` de `@crm/shared`. Cada seção é uma constante em `farm-form-page.tsx`, compostas na lista `sections`; seção nova (proprietários, precificação) entra por inserção nessa lista, e na ficha por um bloco novo em `DataSection` (`farm-sections.tsx`), sem placeholder vazio. Área pelo `AreaInput` na unidade da empresa, entregando hectares. Na edição só vai ao `PATCH` o que mudou — a área não editada não é reenviada, para a exibição em alqueire não gerar deriva nem histórico.
- Praça: sugerida pelo município (`fetchTradingPostSuggestion`) só enquanto a pessoa não a escolheu à mão nesta edição.
- Corretor responsável: com escopo `own` (`useDataScope('fazendas')`) o campo é somente leitura no próprio usuário; com `all`, `UserField` (equipe da empresa).
- No `PATCH` só vai o que mudou: aptidões e culturas só se o **conjunto** mudou (comparado ordenado); latitude e longitude sempre em par; distância e coordenada aceitam vírgula (viram ponto).
- Adota `useUnsavedChangesGuard`: `guard.release()` antes do `navigate` no save e no cancelar (o `EntityForm` já confirmou o descarte), `{guard.dialog}` no JSX.
- A ficha (aba Dados) mostra os mesmos blocos, na mesma ordem.

## Proprietários (issue #148)

- `farm-owners-field.tsx`: lista de `ContactField` (papel `owner`) com marca de principal e retirar. O primeiro incluído vira principal; retirar o principal promove o próximo. Sem `contatos.ver` o seletor é somente leitura e não se inclui ninguém; retirar e trocar o principal continuam possíveis.
- O formulário só envia `owners` se o conjunto ou o principal mudou.
- `contact-farms-section.tsx` registra a seção "Fazendas" da ficha do contato (papel `owner` + `fazendas.ver`), importada por efeito em `routes.tsx`.
- A lista mostra o proprietário principal com "+N" (`primaryOwnerLabel`).
- Aviso de duplicata: `save` consulta `fetchFarmDuplicates` (nome + município; `excludeId` na edição) antes de gravar e mostra `FarmDuplicateWarning` (sobre o `DuplicateWarning` do DS) sem remontar o formulário. "Salvar mesmo assim" pula a consulta uma vez; consulta que falha não barra o cadastro.
