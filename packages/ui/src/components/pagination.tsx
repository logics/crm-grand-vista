import { type ComponentProps, useEffect, useRef } from 'react';
import { cn } from '../lib/cn.js';
import { clampPage, pageCount, pageRange, pageWindow } from '../lib/pagination.js';
import { controlTone, focusRing } from '../lib/styles.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../primitives/select.js';
import { Icon } from './icon.js';
import { IconButton } from './icon-button.js';

// Paginação por número de página, controlada e isolada do `DataTable`: serve a
// tabelas, listas em cartão, galerias e resultados de matching. Não está no
// export; a aparência segue o `IconButton` e os botões em pílula. A janela de
// páginas é `pageWindow` (`lib/pagination.ts`). Sincronizar a página com a URL
// é da tela.

const numberFormat = new Intl.NumberFormat('pt-BR');

/** Seletor de itens por página: os tamanhos e a troca vêm juntos, ou nenhum dos dois. */
type PageSizeProps =
  | {
      /** Tamanhos oferecidos no seletor de itens por página. */
      pageSizeOptions: number[];
      onPageSizeChange: (pageSize: number) => void;
    }
  | { pageSizeOptions?: undefined; onPageSizeChange?: undefined };

export type PaginationProps = Omit<ComponentProps<'nav'>, 'children'> &
  PageSizeProps & {
    /** Página atual, a partir de 1. */
    page: number;
    pageSize: number;
    /** Total de itens da lista, não só da página. */
    total: number;
    onPageChange: (page: number) => void;
    /** Páginas visíveis de cada lado da atual. */
    siblings?: number;
    /** Cartões e galerias: só anterior, "3 de 12" e próxima. */
    compact?: boolean;
  };

export function Pagination({
  className,
  page: requestedPage,
  pageSize,
  total,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
  siblings = 1,
  compact = false,
  ...props
}: PaginationProps) {
  const navRef = useRef<HTMLElement>(null);
  const pages = pageCount(total, pageSize);
  // o total pode encolher com a tela parada além do fim: mostra-se a última
  const page = clampPage(requestedPage, pages);

  // A seta usada para chegar à ponta fica desabilitada e o navegador tira o
  // foco dela (vai para o `body`): ele passa à página atual, ou à outra seta
  // na compacta. A marca é da seta, porque depois da troca não há mais como
  // saber quem tinha o foco.
  const refocusAtEdge = useRef(false);
  useEffect(() => {
    if (!refocusAtEdge.current) return;
    refocusAtEdge.current = false;
    navRef.current?.querySelector<HTMLButtonElement>(compact ? 'button:enabled' : '[aria-current="page"]')?.focus();
  }, [page, compact]);

  const goTo = (target: number) => {
    if (target !== page && target >= 1 && target <= pages) onPageChange(target);
  };
  const goToFromArrow = (target: number) => {
    refocusAtEdge.current = target === 1 || target === pages;
    goTo(target);
  };

  const { from, to } = pageRange(page, pageSize, total);
  const summary =
    pages === 0
      ? 'Nenhum item'
      : compact
        ? `${numberFormat.format(page)} de ${numberFormat.format(pages)}`
        : `${numberFormat.format(from)}–${numberFormat.format(to)} de ${numberFormat.format(total)}`;

  const previous = pages > 1 && (
    <IconButton
      icon="chevron-left"
      label="Página anterior"
      size="sm"
      disabled={page <= 1}
      onClick={() => goToFromArrow(page - 1)}
    />
  );
  const next = pages > 1 && (
    <IconButton
      icon="chevron-right"
      label="Próxima página"
      size="sm"
      disabled={page >= pages}
      onClick={() => goToFromArrow(page + 1)}
    />
  );
  const summaryText = <span className="gv-num whitespace-nowrap text-xs text-text-muted">{summary}</span>;

  return (
    <nav
      ref={navRef}
      data-slot="pagination"
      aria-label="Paginação"
      className={cn(
        compact ? 'inline-flex items-center gap-3' : 'flex flex-wrap items-center justify-between gap-5',
        className,
      )}
      {...props}
    >
      {compact ? (
        <>
          {previous}
          {summaryText}
          {next}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-6">
            {summaryText}
            {/* fica mesmo com uma página só: quem escolheu 100 itens precisa poder voltar a 25 */}
            {pageSizeOptions && pages > 0 && (
              <PageSizeSelect value={pageSize} options={pageSizeOptions} onChange={onPageSizeChange} />
            )}
          </div>
          {pages > 1 && (
            <div className="flex items-center gap-2">
              {previous}
              <ul className="flex items-center gap-1">
                {pageWindow({ page, pageCount: pages, siblings }).map((item, index) =>
                  item === 'ellipsis' ? (
                    <li
                      key={`ellipsis-${index}`}
                      aria-hidden
                      className="flex size-control-height-sm items-center justify-center text-text-faint"
                    >
                      <Icon name="more-horizontal" size="sm" />
                    </li>
                  ) : (
                    <li key={item}>
                      <PageButton page={item} current={item === page} onSelect={() => goTo(item)} />
                    </li>
                  ),
                )}
              </ul>
              {next}
            </div>
          )}
        </>
      )}
    </nav>
  );
}

type PageButtonProps = { page: number; current: boolean; onSelect: () => void };

/** Número da página, em pílula; a atual fica em verde e não dispara troca. */
function PageButton({ page, current, onSelect }: PageButtonProps) {
  return (
    <button
      type="button"
      aria-label={`Página ${page}`}
      aria-current={current ? 'page' : undefined}
      onClick={onSelect}
      className={cn(
        'gv-num inline-flex h-control-height-sm min-w-control-height-sm cursor-pointer items-center justify-center',
        'rounded-pill px-3 text-xs font-medium transition-control',
        current ? controlTone.primary : controlTone.ghost,
        focusRing,
      )}
    >
      {numberFormat.format(page)}
    </button>
  );
}

type PageSizeSelectProps = { value: number; options: number[]; onChange: (pageSize: number) => void };

/** "Itens por página" com o `Select` do sistema. */
function PageSizeSelect({ value, options, onChange }: PageSizeSelectProps) {
  return (
    <label className="inline-flex items-center gap-3 text-xs text-text-muted">
      <span aria-hidden>Itens por página</span>
      <Select value={String(value)} onValueChange={(next) => onChange(Number(next))}>
        {/* 84px: cabe o "100" com a divisa */}
        <SelectTrigger
          size="sm"
          aria-label="Itens por página"
          className="gv-num w-[calc(2*var(--space-10)+var(--space-2))]"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={String(option)} className="gv-num">
              {numberFormat.format(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
