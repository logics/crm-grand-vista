import * as React from 'react';

/**
 * Pill button. One `primary` (deep green) per view; `accent` (gold) only for the single highest-value CTA.
 * @startingPoint section="Core" subtitle="Botões pill, sombra suave" viewport="700x120"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary = green filled · accent = gold · secondary = white + soft shadow · soft = stone fill · dark = inverse · ghost = text-only · danger = soft red */
  variant?: 'primary' | 'accent' | 'secondary' | 'soft' | 'dark' | 'ghost' | 'danger';
  /** sm 32px · md 40px · lg 48px. Use lg for primary mobile actions. */
  size?: 'sm' | 'md' | 'lg';
  /** Lucide icon before the label. */
  icon?: string;
  /** Lucide icon after the label. */
  iconRight?: string;
  /** Small round counter after the label (e.g. selected rows, filters). */
  count?: number | string;
  /** Stretch to container width. */
  block?: boolean;
}
export function Button(props: ButtonProps): JSX.Element;
