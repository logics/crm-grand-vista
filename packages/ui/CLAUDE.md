# packages/ui

Design System: tokens, primitivos shadcn reestilizados e componentes de domínio, documentados em Storybook.

- **Spec:** `docs/specs/design-system.md`; decisão em `docs/adr/0003-design-system-export-e-referencia.md`
- **Depende de:** `@crm/shared`

## Convenções locais

- `design-system/referencia/` é referência visual; seus `.jsx` nunca são importados.
- Tokens em `src/tokens/`, tema do Tailwind em `src/theme.css`, entrada `@crm/ui/styles.css`. Regra de nome das classes: seção "Tema do Tailwind" da spec.
- Primitivos shadcn em `src/primitives/`, com a API do Radix (ver "Divisão de camadas" na spec). Receitas de classe compartilhadas (foco, campo, superfície flutuante, item de lista) em `src/lib/styles.ts`; junção de classes sempre por `cn` (`src/lib/cn.ts`), que conhece as escalas dos tokens.
- Classe fora dos tokens não gera CSS e falha em silêncio: `test/primitives/classes.test.tsx` renderiza cada primitivo e exige regra para toda classe. Primitivo novo entra lá.
- As regras de aderência ao DS estão no `.oxlintrc.json` da raiz (cor hex crua, px cru, fonte fora do DS, props e variantes de cada componente) e rodam em `pnpm lint`.
