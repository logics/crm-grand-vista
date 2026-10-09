import * as React from 'react';

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0–100. */
  value: number;
  label?: React.ReactNode;
  /** Right-aligned readout, e.g. "7 de 12". */
  valueLabel?: React.ReactNode;
  tone?: 'brand' | 'gold' | 'success' | 'danger';
  /** Track height in px. Default 6. */
  height?: number;
}
export function ProgressBar(props: ProgressBarProps): JSX.Element;
