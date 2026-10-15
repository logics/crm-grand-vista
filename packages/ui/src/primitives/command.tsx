import { Command as CommandPrimitive } from 'cmdk';
import { Search } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn.js';
import { disabledControl, iconStroke, listItem, listLabel, listSeparator } from '../lib/styles.js';

// Lista filtrável do shadcn sobre o cmdk: setas e Enter navegam e escolhem,
// digitar filtra. Com o Popover, é a base do `AsyncCombobox`.

export function Command({ className, ...props }: ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn('flex size-full flex-col overflow-hidden bg-surface-raised text-text-body', className)}
      {...props}
    />
  );
}

export function CommandInput({ className, ...props }: ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div data-slot="command-input-wrapper" className="flex items-center gap-4 border-b border-border-subtle px-5">
      <Search className="size-6 shrink-0 text-text-faint" strokeWidth={iconStroke} />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          'h-control-height w-full bg-transparent text-sm text-text-body outline-none placeholder:text-text-faint',
          disabledControl,
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function CommandList({ className, ...props }: ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn('max-h-[18rem] scroll-py-2 overflow-x-hidden overflow-y-auto p-2', className)}
      {...props}
    />
  );
}

export function CommandEmpty({ className, ...props }: ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn('py-8 text-center text-sm text-text-muted', className)}
      {...props}
    />
  );
}

export function CommandGroup({ className, heading, ...props }: ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      heading={heading && <span className={listLabel}>{heading}</span>}
      className={className}
      {...props}
    />
  );
}

export function CommandItem({ className, ...props }: ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        listItem,
        'data-[selected=true]:bg-surface-hover',
        'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-45',
        className,
      )}
      {...props}
    />
  );
}

export function CommandSeparator({ className, ...props }: ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn(listSeparator, className)}
      {...props}
    />
  );
}

/** Atalho de teclado alinhado à direita do item. */
export function CommandShortcut({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn('ml-auto font-mono text-micro tracking-eyebrow text-text-faint', className)}
      {...props}
    />
  );
}
