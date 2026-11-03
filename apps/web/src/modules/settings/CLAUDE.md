# settings (front)

Configurações: navegação lateral e a página de cada cadastro auxiliar.

- **Spec:** `docs/specs/fase-1-configuracoes.md`; issue #102
- **Depende de:** `@crm/shared` (registro `VOCABULARIES`), `@crm/ui`, `src/listing`, `src/shell`

## Convenções locais

- O menu lateral (`settings-layout.tsx`) e a página (`vocabulary-page.tsx`) leem o registro de `@crm/shared`: cadastro novo não muda a tela. No mobile o menu vira um `Select`.
- A página é a `ListPage` da fundação; o estado da lista vive na URL. Escrita pelas mutations de `vocabulary-api.ts`, que invalidam a lista do cadastro. A recusa da API (409) vira `VocabularyRequestError`, mostrada no diálogo sem fechá-lo.
- O item "Configurações" do menu principal exige `configuracoes.gerenciar`.
- Falta: item "Parâmetros" (depende de `tenant_settings`), reordenação e coluna de significado (cadastro manual).
