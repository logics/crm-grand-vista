import { Switch as SwitchPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn.js';
import { useFieldControl } from '../lib/field-control.js';
import { disabledControl, focusRing } from '../lib/styles.js';

// Interruptor do shadcn sobre o Radix (`role="switch"`, Espaço alterna). Do
// export (`Switch.jsx`): trilho verde quando ligado, polegar branco.
// Efeito imediato — nunca acompanha botão Salvar.

export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  const control = useFieldControl(props);
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        // trilho: dois polegares mais a folga de --space-1 de cada lado
        'peer inline-flex h-7 w-[calc(2*var(--space-6)+2*var(--space-1))] shrink-0 cursor-pointer items-center',
        'rounded-pill p-1 transition-control',
        'data-[state=checked]:bg-brand-primary data-[state=unchecked]:bg-border-default',
        focusRing,
        disabledControl,
        className,
      )}
      {...control}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block size-6 rounded-pill bg-surface-card shadow-xs',
          'transition-transform duration-fast ease-out data-[state=checked]:translate-x-6',
        )}
      />
    </SwitchPrimitive.Root>
  );
}
