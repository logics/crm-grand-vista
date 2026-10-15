import { Tabs as TabsPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn.js';
import { disabledControl, focusRing } from '../lib/styles.js';

// Abas do shadcn sobre o Radix: setas movem entre as abas, Home/End vão às
// pontas, e só a aba ativa entra na ordem de Tab. Do export (`Tabs.jsx`) vêm as
// duas variantes: `segmented` (trilho em pílula com polegar branco — filtros,
// períodos, visões) e `underline` (filete de tinta — divide a ficha de uma
// fazenda ou de um comprador em painéis). As duas rolam na horizontal em tela
// estreita.

export const Tabs = TabsPrimitive.Root;

const listVariant = {
  segmented: 'inline-flex gap-1 rounded-pill bg-surface-sunken p-2',
  underline: 'flex gap-7 border-b border-border-subtle',
} as const;

export type TabsListProps = ComponentProps<typeof TabsPrimitive.List> & {
  variant?: keyof typeof listVariant;
  /** Altura das abas na variante `segmented`. */
  size?: 'sm' | 'md';
};

export function TabsList({ className, variant = 'segmented', size = 'md', ...props }: TabsListProps) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      data-size={size}
      className={cn(
        'group/tabs max-w-full overflow-x-auto [scrollbar-width:none]',
        listVariant[variant],
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center gap-3 whitespace-nowrap text-text-muted transition-control',
        'hover:text-text-body data-[state=active]:font-medium data-[state=active]:text-text-heading',
        // segmented: polegar branco sob a aba ativa
        'group-data-[variant=segmented]/tabs:h-9 group-data-[variant=segmented]/tabs:rounded-pill',
        'group-data-[variant=segmented]/tabs:px-5 group-data-[variant=segmented]/tabs:text-xs',
        'group-data-[size=sm]/tabs:group-data-[variant=segmented]/tabs:h-8',
        'group-data-[variant=segmented]/tabs:data-[state=active]:bg-surface-card',
        // fora do foco: no foco, o anel dourado ocupa a sombra
        'group-data-[variant=segmented]/tabs:data-[state=active]:not-focus-visible:shadow-xs',
        // underline: filete de tinta sob a aba ativa, sobre o filete da lista
        'group-data-[variant=underline]/tabs:-mb-px group-data-[variant=underline]/tabs:border-b-2',
        'group-data-[variant=underline]/tabs:border-transparent group-data-[variant=underline]/tabs:pb-5',
        'group-data-[variant=underline]/tabs:text-sm group-data-[variant=underline]/tabs:rounded-xs',
        'group-data-[variant=underline]/tabs:data-[state=active]:border-text-heading',
        focusRing,
        disabledControl,
        className,
      )}
      {...props}
    />
  );
}

/** Contagem ao lado do rótulo da aba (documentos, compradores compatíveis). */
export function TabsCount({ className, ...props }: ComponentProps<'span'>) {
  return <span data-slot="tabs-count" className={cn('gv-num text-micro text-text-faint', className)} {...props} />;
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn(focusRing, className)} {...props} />;
}
