import * as React from 'react';

export interface TabItem { id: string; label: React.ReactNode; icon?: string; count?: number }

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  items: TabItem[];
  active?: string;
  onSelect?: (id: string) => void;
  /** segmented = pill track with a white raised thumb (filters, views, periods) · underline = record sections (ficha da fazenda). Both scroll horizontally on mobile. */
  variant?: 'segmented' | 'underline';
  /** Segmented height: md 38 · sm 34. */
  size?: 'sm' | 'md';
}
export function Tabs(props: TabsProps): JSX.Element;
