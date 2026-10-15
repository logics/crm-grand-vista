import type { ReactNode } from 'react';
import { cn } from '../../src/index.js';

// Arranjos das stories que mostram várias variantes lado a lado. As classes
// passam pelo mesmo teste de CSS dos componentes (`test/stories.test.tsx`).

/** Variantes em linha, quebrando quando não cabem. */
export function Row({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-center gap-5', className)}>{children}</div>;
}

/** Variantes empilhadas, para o que ocupa a largura toda. */
export function Stack({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-6', className)}>{children}</div>;
}

/** Grade de cartões com a largura de uma coluna do kit `crm-v2`. */
export function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-[repeat(auto-fill,minmax(calc(8*var(--space-10)),1fr))] gap-6">{children}</div>;
}

/** Fundo verde da marca, para as variantes feitas para superfície escura. */
export function OnInverse({ children }: { children: ReactNode }) {
  return <div className="rounded-card bg-gradient-hero p-7">{children}</div>;
}
