import type { Decorator } from '@storybook/react-vite';
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

/**
 * Larguras máximas da vitrine, em múltiplos de `--space-10` (40px): 280, 320,
 * 360, 480 e 720px — a largura de um campo, de um cartão de funil, de uma
 * coluna de cartões, de um painel lateral e de um formulário de duas colunas do
 * kit `crm-v2`. Classes estáticas, para o Tailwind gerá-las.
 */
const maxWidth = {
  sm: 'max-w-[calc(7*var(--space-10))]',
  md: 'max-w-[calc(8*var(--space-10))]',
  lg: 'max-w-[calc(9*var(--space-10))]',
  xl: 'max-w-[calc(12*var(--space-10))]',
  form: 'max-w-[calc(18*var(--space-10))]',
} as const;

/** Decorator que limita a largura da story, para o componente não esticar no canvas. */
export const constrained =
  (width: keyof typeof maxWidth): Decorator =>
  (Story) => <div className={maxWidth[width]}>{Story()}</div>;
