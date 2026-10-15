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
- Receitas de classe compartilhadas (foco, campo, superfície flutuante, item de lista) em `src/lib/styles.ts`; junção de classes sempre por `cn` (`src/lib/cn.ts`), que conhece as escalas dos tokens.
- Classe fora dos tokens não gera CSS e falha em silêncio: `test/primitives/classes.test.tsx` e `test/components/classes.test.tsx` renderizam cada primitivo e componente, em cada variante, e exigem regra para toda classe (`test/support/classes.tsx`). Primitivo ou componente novo entra lá.
- As regras de aderência ao DS estão no `.oxlintrc.json` da raiz (cor hex crua, paleta crua `--gv-*`, px cru, fonte fora do DS, valores de variante de cada componente) e rodam em `pnpm lint`.
