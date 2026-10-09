import * as React from 'react';

/**
 * Dashboard KPI. Grey label + icon chip, 30px semibold value, delta pill, optional breakdown rows.
 * Use tone="hero" on at most one card per row.
 * @startingPoint section="Data" subtitle="Indicadores do dashboard comercial" viewport="700x180"
 */
export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Sentence-case label, e.g. "Valor em negociação". */
  label: React.ReactNode;
  /** Pre-formatted pt-BR value (R$ 48,2 mi). Tabular numerals. */
  value: React.ReactNode;
  /** Trailing unit, e.g. "fazendas", "dias". */
  unit?: React.ReactNode;
  /** Delta pill text, e.g. "12%". */
  delta?: React.ReactNode;
  deltaTone?: 'success' | 'danger' | 'neutral';
  /** Lucide icon in a 32px round chip, top-right. */
  icon?: string;
  /** Small label/value breakdown under the number. */
  rows?: { label: React.ReactNode; value: React.ReactNode }[];
  footnote?: React.ReactNode;
  /** default = white · hero = green gradient · dark = deep green · gold = gold gradient */
  tone?: 'default' | 'hero' | 'dark' | 'gold';
}
export function StatCard(props: StatCardProps): JSX.Element;
