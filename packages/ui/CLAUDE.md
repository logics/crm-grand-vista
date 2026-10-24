# packages/ui

Design System: tokens, primitivos shadcn reestilizados e componentes de domínio, documentados em Storybook.

- **Spec:** `docs/specs/design-system.md`; decisão em `docs/adr/0003-design-system-export-e-referencia.md`
- **Depende de:** `@crm/shared`

## Convenções locais

- `design-system/referencia/` é referência visual; seus `.jsx` nunca são importados.
- Tokens em `src/tokens/`, tema do Tailwind em `src/theme.css`, entrada `@crm/ui/styles.css`. Regra de nome das classes: seção "Tema do Tailwind" da spec.
- Primitivos shadcn em `src/primitives/`, com a API do Radix (ver "Divisão de camadas" na spec). Componentes de apresentação e domínio em `src/components/`, com as props do export mais os atributos nativos do elemento.
- Todo glifo passa pelo `Icon` (`src/components/icon.tsx`), que tem o registro de nomes; glifo novo entra lá. Importar `lucide-react` fora dele é erro de lint.
- Controle de formulário novo lê `useFieldControl` (`src/lib/field-control.ts`), para que o `Field` o nomeie e descreva.
- Medida fora das escalas sai da soma de tokens (`size-[calc(var(--space-6)+var(--space-1))]`), com comentário dizendo o valor do export.
- Receitas de classe compartilhadas (foco, campo, superfície flutuante, item de lista, cartão que sobe no hover) em `src/lib/styles.ts`; junção de classes sempre por `cn` (`src/lib/cn.ts`), que conhece as escalas dos tokens.
- Campo de formulário é branco com filete em repouso e afundado só quando desabilitado — desvio do export, com a tabela de estados na spec ("Divisão de camadas"). Controle novo usa `fieldSurface` ou `fieldFrameSurface`; o que faz papel de campo sem usá-las (área de envio do `MediaUploader`) segue os mesmos estados. Afundado não é cor de repouso nem de arrastar.
- Elemento que não é `<button>` mas abre algo (cartão, linha de tabela) usa `pressable` (`src/lib/pressable.ts`), que o torna focável e acionável por Enter e Espaço.
- Storybook (`pnpm storybook`, porta 6006): uma story por arquivo de `src/components/` e `src/primitives/`, em `stories/<mesmo-nome>.stories.tsx`, com variantes e estados — ao menos duas stories por arquivo. Arranjos de layout compartilhados em `stories/support/layout.tsx`. Texto das stories segue as regras de redação da marca.
- As stories são também os casos dos testes: `test/stories.test.tsx` exige o arquivo de stories de cada componente, renderiza cada story e exige regra de CSS para toda classe que aparece (`test/support/classes.tsx`) — classe fora dos tokens não gera CSS e falha em silêncio. Variante que não está numa story não é documentada nem verificada. Estado que só aparece depois de uma interação (lista aberta pelo usuário, "Ver tudo") é verificado no teste do componente: abre-o e chama `classesWithoutCss` (`test/support/classes.tsx`).
- As regras de aderência ao DS estão no `.oxlintrc.json` da raiz (cor hex crua, paleta crua `--gv-*`, px cru, fonte fora do DS, valores de variante de cada componente, import das referências visuais) e rodam em `pnpm lint`, stories inclusive. Variante nova de componente atualiza a regra de valor correspondente; `test/lint-adherence.test.ts` (raiz) prova as regras.
- Regras de marca e redação para agentes: skill `grand-vista-design` (`.agents/skills/grand-vista-design/SKILL.md`).
