import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn.js';
import { Icon, type IconName } from './icon.js';

// Lista sem registros (`EmptyState.jsx` do export): diz o que falta e oferece a
// única ação que resolve.

export type EmptyStateProps = Omit<ComponentProps<'div'>, 'title'> & {
  /** Glifo no círculo de pedra. */
  icon?: IconName;
  title?: ReactNode;
  description?: ReactNode;
  /** Em geral, um `Button` só. */
  action?: ReactNode;
  /** Respiro menor, para painéis e corpo de tabela. */
  compact?: boolean;
};

export function EmptyState({
  className,
  icon = 'inbox',
  title,
  description,
  action,
  compact = false,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn('flex flex-col items-center gap-5 px-8 text-center', compact ? 'py-9' : 'py-12', className)}
      {...props}
    >
      <span className="grid size-control-height-lg place-items-center rounded-pill bg-surface-sunken text-text-muted">
        <Icon name={icon} size="xl" />
      </span>
      {title && <h3 className="mt-4 text-lg font-semibold text-text-heading">{title}</h3>}
      {description && (
        // 380px do export (9,5 × --space-10): não há token de largura de texto
        <p className="m-0 max-w-[calc(9.5*var(--space-10))] text-sm leading-relaxed text-pretty text-text-faint">
          {description}
        </p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
