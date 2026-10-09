import * as React from 'react';

export interface DealCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Comprador / investidor name — the card's title. */
  client: React.ReactNode;
  /** Associated fazenda (or "3 fazendas" when several). */
  farm?: React.ReactNode;
  /** Pre-formatted valor potencial. */
  value?: React.ReactNode;
  /** Probabilidade de fechamento, 0–100. */
  probability?: number;
  /** Corretor responsável initials or short name. */
  owner?: React.ReactNode;
  /** Próxima atividade obrigatória, e.g. "Visita técnica · 28/07". */
  nextAction?: React.ReactNode;
  /** Renders nextAction as a red Badge (negociação estagnada). */
  overdue?: boolean;
}
export function DealCard(props: DealCardProps): JSX.Element;
