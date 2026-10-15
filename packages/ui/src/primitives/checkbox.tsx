import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { Icon } from '../components/icon.js';
import { cn } from '../lib/cn.js';
import { useFieldControl } from '../lib/field-control.js';
import { disabledControl, focusRing } from '../lib/styles.js';

// Caixa de seleção do shadcn sobre o Radix (`role="checkbox"`, Espaço alterna,
// estado `indeterminate` para "selecionar todos" parcial). Do export
// (`Checkbox.jsx`): caixa verde com check branco. Move os checklists de due
// diligence e os filtros de múltipla escolha.

/** Traço mais grosso que o do `Icon`: o check de 12px some com traço fino sobre o verde. */
const checkStroke = 2.5;

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  const control = useFieldControl(props);
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-xs',
        // contorno de 1px em --border-strong, no lugar do 1,5px em --border-default do export:
        // mesmo peso visual, sem meio pixel (que o lint de aderência barra)
        'bg-surface-card text-brand-on-primary inset-ring inset-ring-border-strong transition-control',
        'data-[state=checked]:bg-brand-primary data-[state=checked]:inset-ring-transparent',
        'data-[state=indeterminate]:bg-brand-primary data-[state=indeterminate]:inset-ring-transparent',
        'aria-invalid:inset-ring-status-danger-fg',
        focusRing,
        disabledControl,
        className,
      )}
      {...control}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="group/indicator flex">
        <Icon name="check" size="xs" strokeWidth={checkStroke} className="group-data-[state=indeterminate]/indicator:hidden" />
        <Icon name="minus" size="xs" strokeWidth={checkStroke} className="hidden group-data-[state=indeterminate]/indicator:block" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
