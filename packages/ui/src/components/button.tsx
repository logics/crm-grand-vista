import type { ComponentProps } from 'react';
import { cn } from '../lib/cn.js';
import { controlTone, disabledControl, focusRing } from '../lib/styles.js';
import { Icon, type IconName, type IconSize } from './icon.js';

// Botão em pílula (`Button.jsx` do export). Um `primary` (verde) por tela;
// `accent` (dourado) só para a ação de maior valor, nunca dois na mesma tela.
// Rótulo em sentence case, começando pelo verbo: "Cadastrar fazenda". O tipo
// padrão é `button`: dentro de um formulário, só envia quem declara `submit`.

/** Contador claro sobre os fundos escuros, verde sobre os demais. */
const countOnDark = 'bg-brand-on-primary text-brand-primary';
const countOnLight = 'bg-brand-primary text-brand-on-primary';

const buttonVariant = {
  primary: { surface: controlTone.primary, count: countOnDark },
  // o export dá ao dourado uma sombra dourada que não tem token; fica sem sombra
  accent: { surface: 'bg-brand-accent text-brand-on-accent enabled:hover:bg-brand-accent-hover', count: countOnLight },
  secondary: { surface: 'bg-surface-card text-text-body shadow-xs enabled:hover:bg-surface-sunken', count: countOnLight },
  soft: { surface: controlTone.soft, count: countOnLight },
  // escuro e perigo escurecem no hover: o export usa cores sem token (preto, vermelho mais fundo)
  dark: { surface: 'bg-surface-inverse text-text-on-inverse enabled:hover:brightness-75', count: countOnDark },
  ghost: { surface: controlTone.ghost, count: countOnLight },
  danger: { surface: 'bg-status-danger-bg text-status-danger-fg enabled:hover:brightness-95', count: countOnLight },
} as const;

export type ButtonVariant = keyof typeof buttonVariant;

const buttonSize = {
  sm: { box: 'h-control-height-sm px-5 text-xs', icon: 'sm' },
  md: { box: 'h-control-height px-6 text-sm', icon: 'md' },
  lg: { box: 'h-control-height-lg px-7 text-body', icon: 'lg' },
} as const satisfies Record<string, { box: string; icon: IconSize }>;

export type ButtonSize = keyof typeof buttonSize;

export type ButtonProps = ComponentProps<'button'> & {
  /** primary verde · accent dourado · secondary branco com sombra · soft pedra · dark inverso · ghost só texto · danger vermelho suave */
  variant?: ButtonVariant;
  /** sm 32 · md 40 · lg 48 (lg na ação principal do mobile). */
  size?: ButtonSize;
  /** Glifo antes do rótulo. */
  icon?: IconName;
  /** Glifo depois do rótulo. */
  iconRight?: IconName;
  /** Contador redondo depois do rótulo: linhas selecionadas, filtros aplicados. */
  count?: number | string;
  /** Ocupa a largura do contêiner. */
  block?: boolean;
};

export function Button({
  className,
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  count,
  block = false,
  type = 'button',
  ...props
}: ButtonProps) {
  const { box, icon: iconSize } = buttonSize[size];
  return (
    <button
      data-slot="button"
      type={type}
      data-variant={variant}
      className={cn(
        block ? 'flex w-full' : 'inline-flex',
        'cursor-pointer items-center justify-center gap-4 whitespace-nowrap rounded-control font-medium leading-none',
        'transition-control enabled:active:translate-y-px',
        box,
        buttonVariant[variant].surface,
        focusRing,
        disabledControl,
        className,
      )}
      {...props}
    >
      {icon && <Icon name={icon} size={iconSize} />}
      {children}
      {count != null && (
        <span
          data-slot="button-count"
          className={cn(
            'gv-num inline-flex h-[calc(var(--space-6)+var(--space-1))] min-w-[calc(var(--space-6)+var(--space-1))]',
            'items-center justify-center rounded-pill px-2 text-label',
            buttonVariant[variant].count,
          )}
        >
          {count}
        </span>
      )}
      {iconRight && <Icon name={iconRight} size={iconSize} />}
    </button>
  );
}
