import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn.js';
import { orEmDash } from '../lib/em-dash.js';

// Grade de rótulo e valor da ficha técnica (`SpecList.jsx` do export): solo,
// topografia, água, infraestrutura, produtividade. Valor ausente vira
// travessão — dado nunca é inventado.

export type SpecItem = {
  label: ReactNode;
  value?: ReactNode;
  /** Valor em Geist Mono: matrícula, CAR, CCIR, códigos. */
  mono?: boolean;
};

/** Colunas da grade: 2 em painéis, 3 ou 4 em páginas largas — que no mobile caem para 2. */
const specColumns = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3 max-mobile:grid-cols-2',
  4: 'grid-cols-4 max-mobile:grid-cols-2',
} as const;

export type SpecListProps = ComponentProps<'dl'> & {
  items: SpecItem[];
  columns?: keyof typeof specColumns;
};

export function SpecList({ className, items, columns = 2, ...props }: SpecListProps) {
  return (
    <dl data-slot="spec-list" className={cn('grid gap-x-9 gap-y-5', specColumns[columns], className)} {...props}>
      {items.map((item, index) => (
        <div key={index} className="flex min-w-0 flex-col gap-1 border-b border-border-subtle pb-4">
          <dt className="gv-eyebrow">{item.label}</dt>
          <dd className={cn('text-sm font-medium text-text-body', item.mono && 'font-mono')}>{orEmDash(item.value)}</dd>
        </div>
      ))}
    </dl>
  );
}
