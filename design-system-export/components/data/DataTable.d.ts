import * as React from 'react';

export interface DataTableColumn {
  key: string;
  label: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: number | string;
  /** Render in Geist Mono (IDs, matrícula, códigos). Numbers are always tabular. */
  mono?: boolean;
  /** Medium weight — use on the name/primary column. */
  strong?: boolean;
  /** Muted text colour for secondary columns. */
  muted?: boolean;
  /** Allow the cell to wrap (default: nowrap). */
  wrap?: boolean;
  sorted?: 'asc' | 'desc';
  /** Custom cell renderer — return Badges, Tags, IconButtons here. */
  render?: (row: any) => React.ReactNode;
}

/**
 * Record table: stone header band with sentence-case grey labels, 56px rows, hairline separators.
 * Place inside a Card with padding="0". On mobile (≤760px) replace with a stacked card list.
 * @startingPoint section="Data" subtitle="Tabela de registros com badges e ações" viewport="700x260"
 */
export interface DataTableProps extends React.HTMLAttributes<HTMLDivElement> {
  columns: DataTableColumn[];
  rows: any[];
  /** 44px rows instead of 56px. */
  dense?: boolean;
  onRowClick?: (row: any, index: number) => void;
  /** Row ids to highlight as selected. */
  selected?: (string | number)[];
  /** Empty-state text. */
  empty?: React.ReactNode;
}
export function DataTable(props: DataTableProps): JSX.Element;
