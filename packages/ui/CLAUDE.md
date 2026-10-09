# packages/ui

Design System: tokens, primitivos shadcn reestilizados e componentes de domínio, documentados em Storybook.

- **Spec:** `docs/specs/design-system.md`; decisão em `docs/adr/0003-design-system-export-e-referencia.md`
- **Depende de:** `@crm/shared`

## Convenções locais

- `design-system-export/` é referência visual e fonte dos tokens; seus `.jsx` nunca são importados.
- As regras de aderência ao DS estão no `.oxlintrc.json` da raiz (cor hex crua, px cru, fonte fora do DS, props e variantes de cada componente) e rodam em `pnpm lint`.
