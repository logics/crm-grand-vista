import { Popover as PopoverPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn.js';
import { floatingOffset, floatingSurface } from '../lib/styles.js';

// Popover do shadcn sobre o Radix: posicionamento que desvia da borda, Escape e
// clique fora fecham, foco volta ao gatilho. É a base do `AsyncCombobox`
// (com o Command) e do `DateRangePicker` (com o Calendar). A largura é a do
// conteúdo; quem compõe define a sua.

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;
export const PopoverClose = PopoverPrimitive.Close;

export function PopoverContent({
  className,
  align = 'center',
  sideOffset = floatingOffset,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          floatingSurface,
          'p-6 outline-none origin-(--radix-popover-content-transform-origin)',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
