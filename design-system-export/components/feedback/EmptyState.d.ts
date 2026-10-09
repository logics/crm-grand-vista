import * as React from 'react';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Lucide icon name inside the stone circle. */
  icon?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Usually a single Button. */
  action?: React.ReactNode;
  /** Tighter padding for panels and table bodies. */
  compact?: boolean;
}
export function EmptyState(props: EmptyStateProps): JSX.Element;
