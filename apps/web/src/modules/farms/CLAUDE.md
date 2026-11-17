# farms (front)

Lista, ficha e formulário de fazendas (cadastro mínimo, #145; técnico e comercial, #147).

- **Spec:** `docs/specs/fase-1-fazendas.md`
- **Depende de:** `@crm/shared`, `@crm/ui`, `src/listing`, `src/history`, `src/record-sections`, `src/shell`, `modules/settings` (`VocabularyField`, sugestão de praça, contexto de exibição de área), `modules/municipalities`, `modules/users`

## Convenções locais

- Rotas: `farms`, `farms/new`, `farms/:id`, `farms/:id/edit`; menu "Fazendas" com `fazendas.ver`.
- A ficha é `RecordSections` sobre `farmSections` (`farm-sections.tsx`), o mesmo mecanismo da ficha do contato: quem pendura algo registra a seção ali. Dados e Histórico de alterações são as desta issue.
- Formulário de uma página, em seções ancoradas (`identificacao`, `areas`, `comercial`, `tecnico`; índice de âncoras no topo): `farmFormSchema` de `@crm/shared`. Cada seção é uma constante em `farm-form-page.tsx`, compostas na lista `sections`; seção nova (proprietários, precificação) entra por inserção nessa lista, e na ficha por um bloco novo em `DataSection` (`farm-sections.tsx`), sem placeholder vazio. Área pelo `AreaInput` na unidade da empresa, entregando hectares. Na edição só vai ao `PATCH` o que mudou — a área não editada não é reenviada, para a exibição em alqueire não gerar deriva nem histórico.
- Exclusão na ficha (#150): botão "Excluir" com `fazendas.excluir`. Status de significado `inactive` abre o `ConfirmDialog` com confirmação digitada (o nome exato da fazenda habilita o botão); outro status abre só a explicação "Desative a fazenda antes de excluir.". Recusa da API (409) aparece na ficha, sem sair dela.
- Praça: sugerida pelo município (`fetchTradingPostSuggestion`) só enquanto a pessoa não a escolheu à mão nesta edição.
- Corretor responsável: com escopo `own` (`useDataScope('fazendas')`) o campo é somente leitura no próprio usuário; com `all`, `UserField` (equipe da empresa).
- **Precificação (#146):** seção "Precificação" do formulário depois de Áreas: `Select` do modo (Sem preço, Em reais, Em sacas); em reais, `MoneyInput`; em sacas, `DecimalInput` (quantidade), unidade, tipo do alqueire (só por alqueire, nasce com o padrão da empresa e é editável) e cultura (`VocabularyField crops`). Trocar de modo com valor preenchido abre `ConfirmDialog`; ao confirmar, os campos do modo anterior são limpos. Na edição a precificação vai ao `PATCH` como bloco inteiro, e só se algum dos seis valores mudou; a avaliação em sacas não passa pela conversão de área (a unidade vai junto, não há deriva).
- A ficha (Dados) mostra o preço pedido e os derivados em reais; a avaliação em sacas com sacas por hectare; ou "Preço não informado". Os rótulos dos derivados vêm de `PRICE_DERIVATIVE_LABELS` (não são colunas).
- No `PATCH` só vai o que mudou: aptidões e culturas só se o **conjunto** mudou (comparado ordenado); latitude e longitude sempre em par; distância e coordenada aceitam vírgula (viram ponto).
- Adota `useUnsavedChangesGuard`: `guard.release()` antes do `navigate` no save e no cancelar (o `EntityForm` já confirmou o descarte), `{guard.dialog}` no JSX.
- A ficha (aba Dados) mostra os mesmos blocos, na mesma ordem.

## Proprietários (issue #148)

- `farm-owners-field.tsx`: lista de `ContactField` (papel `owner`) com marca de principal e retirar. O primeiro incluído vira principal; retirar o principal promove o próximo. Sem `contatos.ver` o seletor é somente leitura e não se inclui ninguém; retirar e trocar o principal continuam possíveis.
- O formulário só envia `owners` se o conjunto ou o principal mudou.
- `contact-farms-section.tsx` registra a seção "Fazendas" da ficha do contato (papel `owner` + `fazendas.ver`), importada por efeito em `routes.tsx`.
- A lista mostra o proprietário principal com "+N" (`primaryOwnerLabel`).
- Aviso de duplicata: `save` consulta `fetchFarmDuplicates` (nome + município; `excludeId` na edição) antes de gravar e mostra `FarmDuplicateWarning` (sobre o `DuplicateWarning` do DS) sem remontar o formulário. "Salvar mesmo assim" pula a consulta uma vez; consulta que falha não barra o cadastro.
- Textos longos (#164): `documentNotes`, `soil`, `topography`, `water`, `historicalProductivity`, `infrastructure`, `technicalSummary` e `differentials` usam o `Textarea` do DS (`@crm/ui`), não o `Input` de uma linha.
- Lista (#151): filtros em `farm-filters.tsx` (região por `MunicipalityPicker allowUf`, status, área e valor mín/máx, "Sem preço" à vista; praça, aptidões, culturas, níveis, situação documental, distâncias, proprietário e corretor responsável no painel "Mais filtros"), escritos na URL pelo `useListQuery` com o mesmo `farmListQuerySchema` da API; "Sem preço" e valor se desativam mutuamente. Corretor responsável só com escopo `all`; proprietário só com `contatos.ver` (ou vindo no link). Colunas finais com `farmPriceSummary` (reais, sacas ou "Preço não informado"); o mobile usa `FarmCard` (`priceUnit={null}`, status neutro).
- `FarmField` (`farm-field.tsx`): o `FarmPicker` ligado a `GET /farms/options` (`searchFarmOptions`/`resolveFarmOptions` em `farms-api.ts`). Sem cadastrar; ainda sem consumidor.
