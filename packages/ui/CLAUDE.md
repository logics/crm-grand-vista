# packages/ui

Design System: tokens, primitivos shadcn reestilizados e componentes de domínio, documentados em Storybook.

- **Spec:** `docs/specs/design-system.md`; decisão em `docs/adr/0003-design-system-export-e-referencia.md`
- **Depende de:** `@crm/shared`

## Convenções locais

- `design-system-export/` é referência visual e fonte dos tokens; seus `.jsx` nunca são importados.
- Tokens em `src/tokens/` (cópia do export, editar só para mudar a marca); o tema do Tailwind em `src/theme.css` só aponta para eles. A aplicação importa `@crm/ui/styles.css`.
- Classe = prefixo do utilitário + nome do token: `bg-surface-card`, `text-text-muted`, `border-border-subtle`, `rounded-card`, `shadow-sm`, `p-6` (`--space-6`), `text-h1` (`--size-h1`), `max-rail:` (`--bp-rail`). O tema padrão do Tailwind não é importado — classe fora dos tokens não gera CSS. A paleta crua `--gv-*` e os apelidos `--a2-*` não viram utilitário.
- As regras de aderência ao DS estão no `.oxlintrc.json` da raiz (cor hex crua, px cru, fonte fora do DS, props e variantes de cada componente) e rodam em `pnpm lint`.
