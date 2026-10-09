import * as React from 'react';

export interface DialogProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  title?: React.ReactNode;
  eyebrow?: React.ReactNode;
  /** Action row under a hairline, right-aligned. In sheet mode buttons should be block. */
  footer?: React.ReactNode;
  onClose?: () => void;
  /** Max width in px. 520 default; 720 for forms. */
  width?: number;
  /** Bottom sheet (mobile ≤760): full width, 28px top radius, grab handle. */
  sheet?: boolean;
}
export function Dialog(props: DialogProps): JSX.Element;
