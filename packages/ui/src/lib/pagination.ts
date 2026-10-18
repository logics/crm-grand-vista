// Aritmética da paginação por número de página (offset), sem React: quantas
// páginas há, que itens a página mostra e quais botões aparecem na janela.

/** Quantidade de páginas; total ou tamanho inválido dão zero. */
export function pageCount(total: number, pageSize: number): number {
  if (!Number.isFinite(total) || !Number.isFinite(pageSize) || total <= 0 || pageSize <= 0) return 0;
  return Math.ceil(total / pageSize);
}

/** Leva a página para o intervalo de 1 a `count`: o total pode encolher com a tela parada além do fim. */
export function clampPage(page: number, count: number): number {
  return Math.min(Math.max(page, 1), count);
}

/** Primeiro e último item da página, a partir de 1; total zero dá `{ from: 0, to: 0 }`. */
export function pageRange(page: number, pageSize: number, total: number): { from: number; to: number } {
  const count = pageCount(total, pageSize);
  if (count === 0) return { from: 0, to: 0 };
  const current = clampPage(page, count);
  return { from: (current - 1) * pageSize + 1, to: Math.min(current * pageSize, total) };
}

export type PageWindowItem = number | 'ellipsis';

export type PageWindowOptions = {
  /** Página atual, a partir de 1; fora do intervalo, vai para a ponta mais próxima. */
  page: number;
  pageCount: number;
  /** Páginas visíveis de cada lado da atual. */
  siblings?: number;
};

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/**
 * Botões da paginação: primeira e última sempre, a atual com `siblings` de
 * cada lado, reticências no salto. A lista tem sempre o mesmo comprimento
 * (`2 * siblings + 5`, ou todas as páginas, se forem menos), para os botões
 * não mudarem de lugar ao trocar de página; por isso a janela encosta na
 * ponta quando a atual está perto dela. Reticências nunca escondem uma página
 * só: ela aparece no lugar.
 */
export function pageWindow({ page, pageCount: count, siblings = 1 }: PageWindowOptions): PageWindowItem[] {
  const slots = 2 * siblings + 5;
  if (count <= slots) return range(1, count);
  const current = clampPage(page, count);
  // a janela da atual fica entre a 3ª e a antepenúltima página: as pontas e o
  // lugar das reticências vêm à parte
  const start = Math.max(Math.min(current - siblings, count - 2 * siblings - 2), 3);
  const end = Math.min(Math.max(current + siblings, 2 * siblings + 3), count - 2);
  return [
    1,
    start > 3 ? 'ellipsis' : 2,
    ...range(start, end),
    end < count - 2 ? 'ellipsis' : count - 1,
    count,
  ];
}
