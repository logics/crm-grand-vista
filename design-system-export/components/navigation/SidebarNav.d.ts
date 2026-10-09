import * as React from 'react';

export interface SidebarItem {
  id?: string;
  label?: React.ReactNode;
  /** Lucide icon name. */
  icon?: string;
  /** Right-aligned counter. */
  badge?: number | string;
  /** When set, the entry renders as a small grey group label (a hairline in the collapsed rail). */
  section?: string;
}

/**
 * Floating white navigation card for the CRM. Active item = deep-green pill with white text.
 * Desktop 264px · tablet (≤1180) collapsed 76px rail · mobile (≤760) replace with a bottom tab bar + menu sheet.
 * @startingPoint section="Navigation" subtitle="Navegação lateral flutuante do CRM" viewport="700x420"
 */
export interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items: SidebarItem[];
  /** Active item id. */
  active?: string;
  onSelect?: (id: string) => void;
  /** Bottom slot: avatar + nome/cargo. */
  footer?: React.ReactNode;
  /** 76px icon-only rail. */
  collapsed?: boolean;
}
export function SidebarNav(props: SidebarNavProps): JSX.Element;
