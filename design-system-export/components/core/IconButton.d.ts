import * as React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Lucide icon name. */
  icon: string;
  /** Required accessible label (also the tooltip). */
  label: string;
  /** sm 32 · md 40 · lg 48 — always circular. */
  size?: 'sm' | 'md' | 'lg';
  /** ghost = no fill · outline = white + 1px inset line (topbar) · soft = stone fill · solid = green */
  variant?: 'ghost' | 'outline' | 'soft' | 'solid';
  /** Red notification dot, top-right. */
  dot?: boolean;
}
export function IconButton(props: IconButtonProps): JSX.Element;
