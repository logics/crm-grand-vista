import * as React from 'react';

export interface TopBarProps extends React.HTMLAttributes<HTMLElement> {
  title?: React.ReactNode;
  /** Grey 12px context line above the title, e.g. "Comercial · Fazendas". Floating white card, 64px. */
  breadcrumb?: React.ReactNode;
  /** Slot for an Input/SearchBar. */
  search?: React.ReactNode;
  /** Right-aligned Buttons / IconButtons / user chip. */
  actions?: React.ReactNode;
}
export function TopBar(props: TopBarProps): JSX.Element;
