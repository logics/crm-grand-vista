import type { ComponentProps } from 'react';
import { cn } from '../lib/cn.js';
import { controlTone, disabledControl, focusRing } from '../lib/styles.js';
import { Icon, type IconName, type IconSize } from './icon.js';

// Botão só de glifo, sempre redondo (`IconButton.jsx` do export): linhas de
// tabela, barras de ferramentas, canto de cartão. `ghost` na interface densa;
// `outline` quando está sozinho (no topo).

const iconButtonVariant = {
  ghost: controlTone.ghost,
  outline: 'bg-surface-card text-text-muted shadow-hairline enabled:hover:bg-surface-sunken enabled:hover:text-text-body',
  soft: controlTone.soft,
  solid: controlTone.primary,
} as const;

const iconButtonSize = {
  sm: { box: 'size-control-height-sm', icon: 'sm' },
  md: { box: 'size-control-height', icon: 'md' },
  lg: { box: 'size-control-height-lg', icon: 'xl' },
} as const satisfies Record<string, { box: string; icon: IconSize }>;

export type IconButtonProps = Omit<ComponentProps<'button'>, 'children'> & {
  icon: IconName;
  /** Nome acessível, obrigatório; também vira a dica ao passar o mouse. */
  label: string;
  /** sm 32 · md 40 · lg 48. */
  size?: keyof typeof iconButtonSize;
  /** ghost sem fundo · outline branco com filete · soft pedra · solid verde */
  variant?: keyof typeof iconButtonVariant;
  /** Ponto vermelho de notificação, no canto superior direito. */
  dot?: boolean;
};

export function IconButton({
  className,
  icon,
  label,
  size = 'md',
  variant = 'ghost',
  dot = false,
  type = 'button',
  ...props
}: IconButtonProps) {
  const { box, icon: iconSize } = iconButtonSize[size];
  return (
    <button
      data-slot="icon-button"
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-pill transition-control',
        box,
        iconButtonVariant[variant],
        focusRing,
        disabledControl,
        className,
      )}
      {...props}
    >
      <Icon name={icon} size={iconSize} />
      {dot && (
        <span
          aria-hidden
          className="absolute top-[22%] right-[24%] size-3 rounded-pill bg-status-danger-fg ring-2 ring-surface-card"
        />
      )}
    </button>
  );
}
