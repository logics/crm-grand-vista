// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BREAKPOINTS, belowQuery, useBelowBreakpoint } from '../../src/lib/breakpoints.js';
import { srcDir } from '../support/tailwind.js';

const theme = readFileSync(`${srcDir}theme.css`, 'utf8');

describe('BREAKPOINTS', () => {
  it.each(Object.entries(BREAKPOINTS))('%s é o mesmo valor do tema', (name, width) => {
    expect(theme).toContain(`--breakpoint-${name}: ${width}px;`);
  });
});

describe('useBelowBreakpoint', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** `matchMedia` falso: a largura da janela decide, e `resize` avisa quem ouve. */
  function stubWidth(initial: number) {
    let width = initial;
    const listeners = new Set<() => void>();
    vi.stubGlobal('matchMedia', (query: string) => ({
      get matches() {
        return query === belowQuery('rail') && width < BREAKPOINTS.rail;
      },
      addEventListener: (_: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    }));
    return (next: number) => {
      width = next;
      for (const listener of listeners) listener();
    };
  }

  it('acompanha a largura da janela', () => {
    const resize = stubWidth(1400);
    const { result } = renderHook(() => useBelowBreakpoint('rail'));
    expect(result.current).toBe(false);

    act(() => resize(1000));
    expect(result.current).toBe(true);
  });

  it('sem `matchMedia`, fica na faixa larga', () => {
    vi.stubGlobal('matchMedia', undefined);
    const { result } = renderHook(() => useBelowBreakpoint('mobile'));
    expect(result.current).toBe(false);
  });
});
