import { describe, expect, it } from 'vitest';
import { pageCount, pageRange, pageWindow } from '../../src/lib/pagination.js';

describe('pageCount', () => {
  it('arredonda para cima e nunca é negativo', () => {
    expect(pageCount(1480, 25)).toBe(60);
    expect(pageCount(1500, 25)).toBe(60);
    expect(pageCount(1501, 25)).toBe(61);
    expect(pageCount(10, 25)).toBe(1);
    expect(pageCount(0, 25)).toBe(0);
  });

  it('total ou tamanho inválido dão zero páginas', () => {
    expect(pageCount(-3, 25)).toBe(0);
    expect(pageCount(100, 0)).toBe(0);
    expect(pageCount(Number.NaN, 25)).toBe(0);
  });
});

describe('pageRange', () => {
  it('primeiro e último item da página, 1-based', () => {
    expect(pageRange(1, 25, 1480)).toEqual({ from: 1, to: 25 });
    expect(pageRange(3, 25, 1480)).toEqual({ from: 51, to: 75 });
  });

  it('a última página termina no total', () => {
    expect(pageRange(60, 25, 1480)).toEqual({ from: 1476, to: 1480 });
  });

  it('total zero é intervalo vazio', () => {
    expect(pageRange(1, 25, 0)).toEqual({ from: 0, to: 0 });
  });
});

describe('pageWindow', () => {
  it('nenhuma página: lista vazia', () => {
    expect(pageWindow({ page: 1, pageCount: 0 })).toEqual([]);
  });

  it('uma página', () => {
    expect(pageWindow({ page: 1, pageCount: 1 })).toEqual([1]);
  });

  it('poucas páginas cabem todas, sem reticências', () => {
    expect(pageWindow({ page: 3, pageCount: 5 })).toEqual([1, 2, 3, 4, 5]);
  });

  it('atual no começo: reticências só antes da última', () => {
    expect(pageWindow({ page: 1, pageCount: 12 })).toEqual([1, 2, 3, 4, 5, 'ellipsis', 12]);
  });

  it('atual no meio: reticências dos dois lados', () => {
    expect(pageWindow({ page: 6, pageCount: 12 })).toEqual([1, 'ellipsis', 5, 6, 7, 'ellipsis', 12]);
  });

  it('atual no fim: reticências só depois da primeira', () => {
    expect(pageWindow({ page: 12, pageCount: 12 })).toEqual([1, 'ellipsis', 8, 9, 10, 11, 12]);
  });

  it('a lista tem sempre o mesmo comprimento, para os botões não pularem de lugar', () => {
    const lengths = Array.from({ length: 12 }, (_, i) => pageWindow({ page: i + 1, pageCount: 12 }).length);
    expect(new Set(lengths)).toEqual(new Set([7]));
  });

  it('reticências nunca escondem uma página só: a página aparece no lugar', () => {
    expect(pageWindow({ page: 4, pageCount: 7 })).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(pageWindow({ page: 4, pageCount: 8 })).toEqual([1, 2, 3, 4, 5, 'ellipsis', 8]);
  });

  it('siblings amplia a janela em volta da atual', () => {
    expect(pageWindow({ page: 10, pageCount: 20, siblings: 2 })).toEqual([
      1,
      'ellipsis',
      8,
      9,
      10,
      11,
      12,
      'ellipsis',
      20,
    ]);
    expect(pageWindow({ page: 10, pageCount: 20, siblings: 0 })).toEqual([1, 'ellipsis', 10, 'ellipsis', 20]);
  });

  it('página fora do intervalo é levada à ponta mais próxima', () => {
    expect(pageWindow({ page: 0, pageCount: 12 })).toEqual(pageWindow({ page: 1, pageCount: 12 }));
    expect(pageWindow({ page: 99, pageCount: 12 })).toEqual(pageWindow({ page: 12, pageCount: 12 }));
  });
});
