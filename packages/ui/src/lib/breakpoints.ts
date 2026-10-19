// Faixas responsivas lidas pelo JavaScript, para o que a classe `max-rail:` ou
// `max-mobile:` não alcança — como a prop `collapsed` da `SidebarNav`. Os
// valores repetem os de `--breakpoint-*` em `theme.css`, porque media query não
// lê var(); um teste confere que os dois não divergem.
import { useSyncExternalStore } from 'react';

/** Largura, em px, abaixo da qual cada faixa vale. */
export const BREAKPOINTS = { rail: 1180, mobile: 760 } as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/** A media query da faixa, igual à que o Tailwind gera para `max-<faixa>:`. */
export const belowQuery = (breakpoint: Breakpoint) => `(width < ${BREAKPOINTS[breakpoint]}px)`;

/** Se a janela está abaixo da faixa; sem `matchMedia` (fora do navegador), não está. */
export function useBelowBreakpoint(breakpoint: Breakpoint): boolean {
  const query = belowQuery(breakpoint);
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia?.(query);
      list?.addEventListener('change', onChange);
      return () => list?.removeEventListener('change', onChange);
    },
    () => window.matchMedia?.(query).matches ?? false,
    () => false,
  );
}
