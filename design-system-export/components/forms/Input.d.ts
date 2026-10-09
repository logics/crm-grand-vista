import * as React from 'react';

/** Place fields on a white surface (Card), never directly on the canvas — the stone fill needs white around it. */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Lucide icon name shown inside, on the left. */
  icon?: string;
  /** Static text before the value, e.g. "R$". */
  prefix?: React.ReactNode;
  /** Static text after the value, e.g. "ha", "sacas". */
  suffix?: React.ReactNode;
  invalid?: boolean;
  /** sm 32 · md 40 · lg 48 (use lg on mobile forms). Stone fill, turns white with a gold ring on focus. */
  size?: 'sm' | 'md' | 'lg';
  /** Fully rounded — for search fields in toolbars and topbars. */
  pill?: boolean;
}
export function Input(props: InputProps): JSX.Element;
