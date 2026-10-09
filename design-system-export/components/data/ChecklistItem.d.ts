import * as React from 'react';

export interface ChecklistItemProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  /** Second line: responsible party, date, document reference. */
  meta?: React.ReactNode;
  /** ok = concluded, pending = awaiting, blocked = impediment, empty = not started. */
  state?: 'ok' | 'pending' | 'blocked' | 'empty';
  /** String renders a tone-matched Badge; a node renders as-is. */
  badge?: React.ReactNode;
  /** Trailing slot, usually an IconButton. */
  action?: React.ReactNode;
}
export function ChecklistItem(props: ChecklistItemProps): JSX.Element;
