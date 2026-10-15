import type { ComponentProps, MouseEvent } from 'react';
import { cn } from '../lib/cn.js';
import { focusRing } from '../lib/styles.js';
import { Icon, type IconName } from './icon.js';

// Chip de pedra para metadado que o usuário digitou ou escolheu (`Tag.jsx` do
// export): regiões de interesse, culturas, filtros aplicados. Estado que o
// sistema calculou é `Badge`.

export type TagProps = ComponentProps<'span'> & {
  /** Mostra o botão de remover e dispara ao clicar nele. */
  onRemove?: (event: MouseEvent<HTMLButtonElement>) => void;
  icon?: IconName;
  /** Selecionado ou filtro aplicado (verde). */
  selected?: boolean;
};

export function Tag({ className, children, onRemove, icon, selected = false, ...props }: TagProps) {
  return (
    <span
      data-slot="tag"
      data-selected={selected || undefined}
      className={cn(
        // 26px de altura e 8px de raio do export, fora das escalas de altura e de raio:
        // saem da escala de espaçamento
        'inline-flex h-[calc(var(--space-8)+var(--space-1))] items-center gap-3 whitespace-nowrap',
        'rounded-[var(--space-4)] text-xs leading-none',
        onRemove ? 'pr-3 pl-5' : 'px-5',
        selected ? 'bg-brand-primary-soft font-medium text-brand-primary' : 'bg-surface-sunken text-text-muted',
        className,
      )}
      {...props}
    >
      {icon && <Icon name={icon} size="sm" />}
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={typeof children === 'string' ? `Remover ${children}` : 'Remover'}
          className={cn(
            'ml-1 inline-flex cursor-pointer rounded-pill p-1 opacity-70 transition-control hover:opacity-100',
            focusRing,
          )}
        >
          <Icon name="x" size="xs" />
        </button>
      )}
    </span>
  );
}
