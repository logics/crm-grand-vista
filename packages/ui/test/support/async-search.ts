// Arranjo comum dos testes do `AsyncCombobox` e dos seletores sobre ele: um
// `search` que o teste responde à mão e a abertura da lista pelo teclado.
import { act, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { expect, vi } from 'vitest';
import type { AsyncComboboxPage } from '../../src/index.js';

export type SearchCall<T> = {
  term: string;
  cursor: string | undefined;
  signal: AbortSignal;
  resolve: (page: AsyncComboboxPage<T>) => void;
  reject: (error: Error) => void;
};

/** `search` falso: cada chamada fica pendente até o teste resolvê-la ou rejeitá-la. */
export function fakeSearch<T, O extends { signal: AbortSignal; cursor?: string } = { signal: AbortSignal; cursor?: string }>() {
  const calls: SearchCall<T>[] = [];
  const search = vi.fn(
    (term: string, { signal, cursor }: O) =>
      new Promise<AsyncComboboxPage<T>>((resolve, reject) => {
        calls.push({ term, cursor, signal, resolve, reject });
      }),
  );
  return { search, calls };
}

export const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

export async function answer<T>(call: SearchCall<T> | undefined, page: AsyncComboboxPage<T>) {
  await act(async () => call!.resolve(page));
}

export function setup() {
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
}

/** Chega ao gatilho pelo Tab (depois dos chips, que vêm antes) e abre a lista com a seta para baixo. */
export async function open(user: ReturnType<typeof setup>, name: string) {
  const trigger = screen.getByRole('combobox', { name });
  for (let i = 0; i < 5 && document.activeElement !== trigger; i++) await user.tab();
  expect(trigger).toHaveFocus();
  await user.keyboard('{ArrowDown}');
  return trigger;
}

export const optionNames = () => screen.queryAllByRole('option').map((option) => option.textContent);
