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
- **Precificação (#146):** seção "Precificação" do formulário depois de Áreas: `Select` do modo (Sem preço, Em reais, Em sacas); em reais, `MoneyInput`; em sacas, `DecimalInput` (quantidade), unidade, tipo do alqueire (só por alqueire, nasce com o padrão da empresa e é editável) e cultura (`VocabularyField crops`). Trocar de modo com valor preenchido abre `ConfirmDialog`; ao confirmar, os campos do modo anterior são limpos. Na edição a precificação vai ao `PATCH` como bloco inteiro, e só se algum dos seis valores mudou; a avaliação em sacas não passa pela conversão de área (a unidade vai junto, não há deriva).
- A ficha (Dados) mostra o preço pedido e os derivados em reais; a avaliação em sacas com sacas por hectare; ou "Preço não informado". Os rótulos dos derivados vêm de `PRICE_DERIVATIVE_LABELS` (não são colunas).
- Aviso de duplicata: `save` consulta `fetchFarmDuplicates` (nome + município; `excludeId` na edição) antes de gravar e mostra `FarmDuplicateWarning` (sobre o `DuplicateWarning` do DS) sem remontar o formulário. "Salvar mesmo assim" pula a consulta uma vez; consulta que falha não barra o cadastro.
