// Buscas simuladas das stories do `AsyncCombobox` e dos seletores sobre ele.
import type { AsyncComboboxPage, AsyncComboboxSearch } from '../../src/index.js';
import { matchesSearch } from '../../src/lib/search-text.js';

/**
 * Filtra `items` pelo texto de cada um (sem diferenciar acento), com um atraso
 * de rede, paginando de `pageSize` em `pageSize` e respeitando o `signal`.
 */
export function simulatedSearch<T>(
  items: T[],
  text: (item: T) => string,
  { pageSize = 6, delayMs = 400 } = {},
): AsyncComboboxSearch<T> {
  return (term, { signal, cursor }) =>
    new Promise<AsyncComboboxPage<T>>((resolve, reject) => {
      const timer = setTimeout(() => {
        const found = items.filter((item) => matchesSearch(text(item), term));
        const start = Number(cursor ?? 0);
        const end = start + pageSize;
        resolve({ items: found.slice(start, end), nextCursor: end < found.length ? String(end) : undefined });
      }, delayMs);
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(signal.reason);
      });
    });
}

/** Hidratação simulada: devolve os itens cujas chaves vieram. */
export const simulatedResolve =
  <T>(items: T[], key: (item: T) => string) =>
  async (ids: string[]) =>
    items.filter((item) => ids.includes(key(item)));

/** Busca que nunca responde: o estado de carregando. */
export const neverAnswers = <T>(): AsyncComboboxSearch<T> => () => new Promise(() => {});

/** Busca sem resultado: o vazio. */
export const answersEmpty = <T>(): AsyncComboboxSearch<T> => async () => ({ items: [] });

/** Busca que falha: o erro com "Tentar de novo". */
export const fails = <T>(): AsyncComboboxSearch<T> => async () => {
  throw new Error('Falha de rede');
};
