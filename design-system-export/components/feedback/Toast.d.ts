import * as React from 'react';

export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: 'success' | 'warning' | 'danger' | 'info';
  title?: React.ReactNode;
  message?: React.ReactNode;
  /** Inline undo / view link. */
  action?: React.ReactNode;
  onClose?: () => void;
}
export function Toast(props: ToastProps): JSX.Element;
