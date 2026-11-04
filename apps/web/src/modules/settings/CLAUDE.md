# settings (front)

Configurações: navegação lateral e a página de cada cadastro auxiliar.

- **Spec:** `docs/specs/fase-1-configuracoes.md`; issue #102
- **Depende de:** `@crm/shared` (registro `VOCABULARIES`), `@crm/ui`, `src/listing`, `src/shell`

## Convenções locais

- O menu lateral (`settings-layout.tsx`) e a página (`vocabulary-page.tsx`) leem o registro de `@crm/shared`: cadastro novo não muda a tela. No mobile o menu vira um `Select`.
- A página é a `ListPage` da fundação; o estado da lista vive na URL. Escrita pelas mutations de `vocabulary-api.ts`, que invalidam a lista do cadastro. A recusa da API (409) vira `VocabularyRequestError`, mostrada no diálogo sem fechá-lo.
- `VocabularyField` (`vocabulary-field.tsx`) é o `VocabularyPicker` ligado à API da empresa ativa, pelo adaptador `vocabulary-source.ts` (`/options`; `ids` hidrata o valor gravado, `includeInactive` só no modo filtro). Contatos e fazendas o usam; nenhum módulo escreve a sua busca. Sem tela própria que o consuma ainda.
- O item "Configurações" do menu principal exige `configuracoes.gerenciar`.
- Cadastro manual não usa a `ListPage`: `manual-entries.tsx` mostra o `ReorderableList` (`@crm/ui`: arrastar, alça de teclado e botões de mover) com a lista inteira, sem busca nem filtro (reordenar exige a lista completa). A nova ordem aparece de imediato (otimista) e `PUT /order` a grava; a recusa volta à ordem do servidor.
- **Praça:** o diálogo mostra o campo extra "Municípios atendidos" (`MunicipalityPicker` múltiplo, valor em códigos IBGE, `resolveMunicipalityItems`) quando o registro marca `servedMunicipalities`; a lista ganha a coluna de contagem. Nome e municípios vão num `PATCH`/`POST` só.
- **Parâmetros** (`parameters-page.tsx`, `/settings/parameters`) e contexto de exibição (`display-context.ts`): `useTenantSettings` carrega os parâmetros uma vez por empresa (chave com o slug); `useDisplayContext`/`useAreaFormatter` os entregam à formatação de área de `@crm/shared`. Todo módulo que exibe área usa `useAreaFormatter`; nenhum formata hectare/alqueire por conta própria.
