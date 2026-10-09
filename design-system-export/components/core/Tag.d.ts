import * as React from 'react';

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Shows a remove affordance and fires on click. */
  onRemove?: (e: React.MouseEvent) => void;
  /** Lucide icon name. */
  icon?: string;
  /** Selected/filter-applied state (green). */
  selected?: boolean;
}
export function Tag(props: TagProps): JSX.Element;
