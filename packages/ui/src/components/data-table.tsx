import type { ComponentProps, Key, ReactNode } from 'react';
import { cn } from '../lib/cn.js';
import { pressable } from '../lib/pressable.js';
import { Icon } from './icon.js';

// Tabela de registros, a lista de trabalho (`DataTable.jsx` do export): faixa
// de cabeçalho em pedra com rótulos cinza em sentence case, linhas de 56px,
// filetes finos, tom ao passar o mouse. Vai dentro de um `Card padding="none"`;
// no mobile, a tela troca a tabela por uma lista de cartões. Coluna numérica é
// `mono` e alinhada à direita, sempre.

const cellAlign = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
} as const;

const ariaSort = { asc: 'ascending', desc: 'descending' } as const;

export type DataTableColumn<Row> = {
  /** Campo do registro mostrado na célula, quando não há `render`; também é a chave da coluna. */
  key: string;
  label: ReactNode;
  align?: keyof typeof cellAlign;
  /** Largura da coluna, dado da tela: `120`, `'30%'`. */
  width?: number | string;
  /** Geist Mono: identificadores, matrícula, códigos. Número é sempre tabular. */
  mono?: boolean;
  /** Peso médio, na coluna do nome. */
  strong?: boolean;
  /** Texto esmaecido, em colunas secundárias. */
  muted?: boolean;
  /** Deixa a célula quebrar linha (o padrão é não quebrar). */
  wrap?: boolean;
  sorted?: keyof typeof ariaSort;
  /** Célula sob medida: `Badge`, `Tag`, `IconButton`. */
  render?: (row: Row, index: number) => ReactNode;
};

export type DataTableProps<Row> = Omit<ComponentProps<'div'>, 'children'> & {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  /** Linhas de 44 em vez de 56. */
  dense?: boolean;
  /** Abre o registro; a linha passa a responder também a Enter e Espaço. */
  onRowClick?: (row: Row, index: number) => void;
  /** Chaves (`rowKey`) das linhas selecionadas. */
  selected?: Key[];
  /** Chave de cada linha; por padrão, `row.id` ou a posição. */
  rowKey?: (row: Row, index: number) => Key;
  /** Texto da tabela vazia. */
  empty?: ReactNode;
};

/** Primeira e última coluna alinham com o respiro do cartão. */
const cellEdge = 'px-5 first:pl-gutter-card last:pr-gutter-card';

function rowId(row: unknown): Key | undefined {
  const id = (row as { id?: unknown } | null)?.id;
  return typeof id === 'string' || typeof id === 'number' ? id : undefined;
}

function cellValue<Row>(row: Row, column: DataTableColumn<Row>, index: number): ReactNode {
  if (column.render) return column.render(row, index);
  return (row as Record<string, ReactNode>)[column.key];
}

export function DataTable<Row>({
  className,
  columns,
  rows,
  dense = false,
  onRowClick,
  selected = [],
  rowKey = (row, index) => rowId(row) ?? index,
  empty = 'Nenhum registro encontrado.',
  ...props
}: DataTableProps<Row>) {
  return (
    <div data-slot="data-table" className={cn('overflow-x-auto', className)} {...props}>
      <table className="gv-num w-full border-collapse text-sm">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                aria-sort={column.sorted && ariaSort[column.sorted]}
                // largura é dado da tela, não valor de estilo: não há token que a substitua
                style={column.width === undefined ? undefined : { width: column.width }}
                className={cn(
                  'h-10 whitespace-nowrap bg-surface-sunken text-xs font-regular leading-none text-text-faint',
                  cellEdge,
                  cellAlign[column.align ?? 'left'],
                )}
              >
                <span className="inline-flex items-center gap-2">
                  {column.label}
                  {column.sorted && <Icon name={column.sorted === 'desc' ? 'arrow-down' : 'arrow-up'} size="xs" />}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="p-10 text-center text-text-faint">
                {empty}
              </td>
            </tr>
          )}
          {rows.map((row, index) => {
            const key = rowKey(row, index);
            const isSelected = selected.includes(key);
            return (
              <tr
                key={key}
                data-selected={isSelected || undefined}
                className={cn(
                  'transition-colors duration-fast',
                  dense ? 'h-row-height-dense' : 'h-row-height',
                  isSelected ? 'bg-surface-selected' : 'hover:bg-surface-hover',
                  // contorno, não sombra: linha de tabela não desenha `box-shadow` em todo navegador
                  onRowClick && 'cursor-pointer outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring',
                )}
                {...pressable({ onClick: onRowClick && (() => onRowClick(row, index)) }, null)}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'border-b border-border-subtle',
                      cellEdge,
                      cellAlign[column.align ?? 'left'],
                      column.muted ? 'text-text-muted' : 'text-text-body',
                      column.strong && 'font-medium',
                      // 12,5px do export vira 12
                      column.mono && 'font-mono text-xs',
                      column.wrap ? 'whitespace-normal' : 'whitespace-nowrap',
                    )}
                  >
                    {cellValue(row, column, index)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
