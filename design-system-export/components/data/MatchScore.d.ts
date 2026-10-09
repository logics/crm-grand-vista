import * as React from 'react';

/**
 * Compatibility dial for Matching Inteligente (fazenda × perfil do comprador).
 * @startingPoint section="Data" subtitle="Nível de compatibilidade oferta × demanda" viewport="700x140"
 */
export interface MatchScoreProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0–100. ≥80 green, 55–79 gold, <55 neutral. */
  value: number;
  size?: 'sm' | 'md' | 'lg';
  /** Hide the text to use it inline inside a table cell. */
  showLabel?: boolean;
}
export function MatchScore(props: MatchScoreProps): JSX.Element;
