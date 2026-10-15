// Receitas de classe que mais de um primitivo usa. Um ajuste visual de foco,
// campo ou superfície flutuante muda aqui e vale para todos.

/** Espessura de traço dos ícones Lucide, a mesma do `Icon` do export. */
export const iconStroke = 1.5;

/** Anel dourado de foco do teclado (`--ring-focus`). */
export const focusRing = 'outline-none focus-visible:shadow-ring-focus';

/** Controle desabilitado: esmaecido e sem clique. */
export const disabledControl =
  'disabled:cursor-not-allowed disabled:opacity-45 data-disabled:cursor-not-allowed data-disabled:opacity-45';

/**
 * Superfície de campo de formulário: afundada em repouso; branca, com contorno
 * dourado e anel de foco quando focada ou aberta; contorno vermelho quando
 * `aria-invalid`.
 */
export const fieldSurface = [
  'bg-surface-sunken text-text-body inset-ring inset-ring-transparent outline-none transition-control',
  'focus-visible:bg-surface-card focus-visible:inset-ring-brand-accent focus-visible:shadow-ring-focus',
  'data-[state=open]:bg-surface-card data-[state=open]:inset-ring-brand-accent data-[state=open]:shadow-ring-focus',
  'aria-invalid:inset-ring-status-danger-fg aria-invalid:focus-visible:shadow-ring-danger',
  disabledControl,
].join(' ');

/** Altura e texto de campo, por tamanho. */
export const fieldSize = {
  sm: 'h-control-height-sm text-sm',
  md: 'h-control-height text-sm',
  lg: 'h-control-height-lg text-body',
} as const;

export type FieldSize = keyof typeof fieldSize;

/** Distância, em px, entre o gatilho e o painel flutuante (prop `sideOffset` do Radix, que não lê token). */
export const floatingOffset = 6;

/** Painel flutuante sobre a página: lista do select, popover, paleta de comandos. */
export const floatingSurface = [
  'z-50 overflow-hidden rounded-md bg-surface-raised text-text-body shadow-lg',
  'motion-safe:data-[state=open]:animate-pop-in motion-safe:data-[state=closed]:animate-pop-out',
].join(' ');

/**
 * Item de lista em painel flutuante. O destaque é só o fundo: o item recebe o
 * foco ao navegar por setas, e o anel global de `:focus-visible` (`base.css`)
 * fica de fora. Destaque e desabilitado ficam com cada primitivo: o Radix marca
 * `data-highlighted`/`data-disabled` só quando verdadeiros, o cmdk grava
 * `data-selected`/`data-disabled` como "true"/"false".
 */
export const listItem =
  'relative flex w-full cursor-default select-none items-center gap-4 rounded-xs px-4 py-3 text-sm text-text-body outline-none focus-visible:shadow-none';

/** Rótulo de grupo em lista de painel flutuante (sobretítulo `.gv-eyebrow`). */
export const listLabel = 'gv-eyebrow block px-4 py-2';

/** Filete entre grupos de uma lista em painel flutuante. */
export const listSeparator = '-mx-2 my-2 h-px bg-border-subtle';
