import * as React from 'react';

/**
 * Search + inline filters row on its own white floating card, so the stone-filled fields read clearly against the canvas.
 * @startingPoint section="Forms" subtitle="Busca com filtros de região, área e valor" viewport="700x140"
 */
export interface SearchBarProps extends React.FormHTMLAttributes<HTMLFormElement> {
  placeholder?: string;
  /** Select/Tag nodes rendered between the field and the submit button. */
  filters?: React.ReactNode;
  buttonLabel?: string;
  /** Drop the white card wrapper — use when the bar already sits inside a Card. */
  bare?: boolean;
  onSubmit?: (e: React.FormEvent) => void;
}
export function SearchBar(props: SearchBarProps): JSX.Element;
