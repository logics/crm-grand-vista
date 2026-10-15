import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Select as SelectPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn.js';
import {
  disabledControl,
  type FieldSize,
  fieldSize,
  fieldSurface,
  floatingOffset,
  floatingSurface,
  iconStroke,
  listItem,
  listLabel,
  listSeparator,
} from '../lib/styles.js';

// Select do shadcn sobre o Radix: abre por Enter, Espaço e setas, navega por
// setas e por digitação, devolve o foco ao gatilho ao fechar e desvia a lista
// da borda da tela. Do export (`Select.jsx`) vêm a superfície de campo e a
// divisa à direita.

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export type SelectTriggerProps = ComponentProps<typeof SelectPrimitive.Trigger> & { size?: FieldSize };

export function SelectTrigger({ className, children, size = 'md', ...props }: SelectTriggerProps) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        fieldSurface,
        fieldSize[size],
        'flex w-full cursor-pointer items-center justify-between gap-4 rounded-input pr-4 pl-5 text-left',
        'data-placeholder:text-text-faint [&>span]:truncate',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="size-6 shrink-0 text-text-faint" strokeWidth={iconStroke} />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

const scrollButton = 'flex cursor-default items-center justify-center py-2 text-text-faint';

export function SelectScrollUpButton({ className, ...props }: ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton data-slot="select-scroll-up" className={cn(scrollButton, className)} {...props}>
      <ChevronUp className="size-6" strokeWidth={iconStroke} />
    </SelectPrimitive.ScrollUpButton>
  );
}

export function SelectScrollDownButton({
  className,
  ...props
}: ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down"
      className={cn(scrollButton, className)}
      {...props}
    >
      <ChevronDown className="size-6" strokeWidth={iconStroke} />
    </SelectPrimitive.ScrollDownButton>
  );
}

/** Lista de opções: abre abaixo do gatilho (ou acima, sem espaço), com a largura dele. */
export function SelectContent({
  className,
  children,
  sideOffset = floatingOffset,
  ...props
}: Omit<ComponentProps<typeof SelectPrimitive.Content>, 'position'>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position="popper"
        sideOffset={sideOffset}
        className={cn(
          floatingSurface,
          'relative max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width)',
          'origin-(--radix-select-content-transform-origin)',
          className,
        )}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport className="w-full min-w-(--radix-select-trigger-width) p-2">
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectLabel({ className, ...props }: ComponentProps<typeof SelectPrimitive.Label>) {
  return <SelectPrimitive.Label data-slot="select-label" className={cn(listLabel, className)} {...props} />;
}

export function SelectItem({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        listItem,
        'pr-10 data-highlighted:bg-surface-hover data-[state=checked]:font-medium',
        disabledControl,
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-4 flex items-center text-brand-primary">
        <Check className="size-6" strokeWidth={iconStroke} />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

export function SelectSeparator({ className, ...props }: ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn(listSeparator, className)}
      {...props}
    />
  );
}
