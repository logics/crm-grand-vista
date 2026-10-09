import * as React from 'react';

export interface SpecItem { label: React.ReactNode; value?: React.ReactNode; mono?: boolean }

export interface SpecListProps extends React.HTMLAttributes<HTMLDListElement> {
  items: SpecItem[];
  /** Grid columns. 2 in panels, 3–4 on wide detail pages. */
  columns?: number;
}
export function SpecList(props: SpecListProps): JSX.Element;
