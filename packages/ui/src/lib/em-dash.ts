import type { ReactNode } from 'react';

/** Valor ausente vira travessão — dado nunca é inventado. Zero é valor. */
export function orEmDash(value: ReactNode): ReactNode {
  return value == null || value === '' ? '—' : value;
}
