// Receitas de classe que mais de um primitivo usa. Um ajuste visual de foco,
// campo ou superfície flutuante muda aqui e vale para todos.

/** Anel dourado de foco do teclado (`--ring-focus`). */
export const focusRing = 'outline-none focus-visible:shadow-ring-focus';

/** Controle desabilitado: esmaecido e sem clique. */
export const disabledControl =
  'disabled:cursor-not-allowed disabled:opacity-45 data-disabled:cursor-not-allowed data-disabled:opacity-45';

/**
 * Superfície de campo de formulário: branca com filete em repouso (o filete a
 * separa do cartão branco; o afundado do export quase não se separava do fundo
 * da tela); contorno dourado e anel de foco quando focada ou aberta; contorno
 * vermelho quando `aria-invalid`; afundada e esmaecida quando desabilitada.
 */
export const fieldSurface = [
  'bg-surface-card text-text-body inset-ring inset-ring-border-default outline-none transition-control',
  'focus-visible:inset-ring-brand-accent focus-visible:shadow-ring-focus',
  'data-[state=open]:inset-ring-brand-accent data-[state=open]:shadow-ring-focus',
  'aria-invalid:inset-ring-status-danger-fg aria-invalid:focus-visible:shadow-ring-danger',
  'disabled:bg-surface-sunken data-disabled:bg-surface-sunken',
  disabledControl,
].join(' ');

/**
 * A mesma superfície de `fieldSurface`, numa moldura em volta do campo (o
 * `Input` com ícone, prefixo e sufixo; o gatilho do `AsyncCombobox`): reage a
 * `focus-within`, ao `aria-expanded` (lista aberta), ao `aria-invalid` e ao
 * `disabled` do filho. As duas mudam juntas.
 */
export const fieldFrameSurface = [
  'bg-surface-card text-text-body inset-ring inset-ring-border-default transition-control',
  'focus-within:inset-ring-brand-accent focus-within:shadow-ring-focus',
  'has-[[aria-expanded=true]]:inset-ring-brand-accent has-[[aria-expanded=true]]:shadow-ring-focus',
  'has-[[aria-invalid=true]]:inset-ring-status-danger-fg has-[[aria-invalid=true]]:focus-within:shadow-ring-danger',
  'has-disabled:cursor-not-allowed has-disabled:bg-surface-sunken has-disabled:opacity-45',
].join(' ');

/** Altura e texto de campo, por tamanho. */
export const fieldSize = {
  sm: 'h-control-height-sm text-sm',
  md: 'h-control-height text-sm',
  lg: 'h-control-height-lg text-body',
} as const;

export type FieldSize = keyof typeof fieldSize;

/** Altura mínima, por tamanho, do campo que cresce com o conteúdo (os chips do `AsyncCombobox`). */
export const fieldMinHeight = {
  sm: 'min-h-control-height-sm',
  md: 'min-h-control-height',
  lg: 'min-h-control-height-lg',
} as const satisfies Record<FieldSize, string>;

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

/** Fundo e texto dos botões, com o hover; `Button` e `IconButton` compartilham as que coincidem. */
export const controlTone = {
  primary: 'bg-brand-primary text-brand-on-primary shadow-primary enabled:hover:bg-brand-primary-hover',
  soft: 'bg-surface-sunken text-text-body enabled:hover:bg-surface-muted',
  ghost: 'bg-transparent text-text-muted enabled:hover:bg-surface-sunken enabled:hover:text-text-body',
} as const;

/** Destaque ou prioridade: anel dourado fino por dentro (1px no lugar do 1,5px do export, sem meio pixel). */
export const accentRing = 'inset-ring inset-ring-brand-accent/55';

/**
 * Cartão que leva a algum lugar: sobe um pixel ao passar o mouse. A sombra do
 * hover fica com cada cartão, porque depende do tom da superfície.
 */
export const liftOnHover =
  'cursor-pointer transition-[box-shadow,translate] duration-normal ease-standard hover:-translate-y-px';
