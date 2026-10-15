import type { ComponentProps } from 'react';
import { cn } from '../lib/cn.js';
import { Icon, type IconName } from './icon.js';

// Pílula de estado que o sistema calculou (`Badge.jsx` do export): status
// comercial, situação documental, grau de qualificação. Uma ou duas palavras,
// em sentence case; nunca mais de duas numa linha. Dado que o usuário digitou
// ou escolheu é `Tag`.

const badgeTone = {
  neutral: 'bg-surface-muted text-text-muted',
  success: 'bg-status-success-bg text-status-success-fg',
  warning: 'bg-status-warning-bg text-status-warning-fg',
  danger: 'bg-status-danger-bg text-status-danger-fg',
  info: 'bg-status-info-bg text-status-info-fg',
  brand: 'bg-brand-primary-soft text-brand-primary',
  gold: 'bg-brand-accent-soft text-brand-accent-ink',
} as const;

const badgeSize = {
  md: 'h-8 px-4 text-xs font-medium',
  sm: 'h-7 px-3 text-micro font-semibold',
} as const;

export type BadgeProps = ComponentProps<'span'> & {
  tone?: keyof typeof badgeTone;
  /** Glifo antes do rótulo. */
  icon?: IconName;
  /** Ponto de status, na cor do texto, antes do rótulo. */
  dot?: boolean;
  /** md 24 (status) · sm 20 em semibold (variações, contadores). */
  size?: keyof typeof badgeSize;
};

export function Badge({ className, children, tone = 'neutral', icon, dot = false, size = 'md', ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(
        'gv-num inline-flex items-center gap-3 whitespace-nowrap rounded-pill leading-none',
        badgeTone[tone],
        badgeSize[size],
        className,
      )}
      {...props}
    >
      {dot && <span aria-hidden className="size-3 shrink-0 rounded-pill bg-current" />}
      {icon && <Icon name={icon} size="xs" />}
      <span>{children}</span>
    </span>
  );
}
