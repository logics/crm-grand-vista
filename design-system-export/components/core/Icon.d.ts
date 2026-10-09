import * as React from 'react';

export interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Lucide icon name in kebab-case, e.g. "map-pin", "tractor", "droplets". */
  name: string;
  /** Square size in px. 14 inline, 18 default, 20 in buttons, 24 in headers. */
  size?: number;
  /** Stroke weight. 1.5 is the brand default — do not mix weights in one view. */
  strokeWidth?: number;
  /** Override colour; defaults to currentColor. */
  color?: string;
  /** Accessible label. Omit for decorative glyphs. */
  title?: string;
}
export function Icon(props: IconProps): JSX.Element;
