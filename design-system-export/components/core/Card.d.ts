import * as React from 'react';

/**
 * Borderless floating surface — the base unit of every screen. 20px radius, soft shadow, no header rule.
 */
export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  /** 16px semibold heading; omit for a bare surface. */
  title?: React.ReactNode;
  /** Grey 12.5px line under the title. */
  subtitle?: React.ReactNode;
  /** Mono uppercase label above the title. */
  eyebrow?: React.ReactNode;
  /** Right-aligned header slot (Button, IconButton, Tabs). */
  action?: React.ReactNode;
  /** CSS padding for header + body. Default var(--gutter-card) = 20px. */
  padding?: string;
  /** default = white · hero = green gradient (one per screen) · inverse = deep green · sunken = stone, no shadow */
  tone?: 'default' | 'hero' | 'inverse' | 'sunken';
  /** Featured/priority: thin gold inner ring. */
  accent?: boolean;
  /** Enables hover lift — only for cards that navigate somewhere. */
  interactive?: boolean;
}
export function Card(props: CardProps): JSX.Element;
