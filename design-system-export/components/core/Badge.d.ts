import * as React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Soft pill: tinted background + matching text. */
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'gold';
  /** Lucide icon before the label. */
  icon?: string;
  /** Leading 6px status dot in the text colour. */
  dot?: boolean;
  /** md 24px (status) · sm 20px semibold (deltas, counters). */
  size?: 'sm' | 'md';
}
export function Badge(props: BadgeProps): JSX.Element;
