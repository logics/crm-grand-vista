import * as React from 'react';

export interface ActivityItem {
  /** Picks the glyph. */
  kind?: 'visita' | 'reuniao' | 'ligacao' | 'mensagem' | 'email' | 'nota' | 'sistema';
  title: React.ReactNode;
  /** Short pt-BR date, e.g. "24/07 · 14h30". */
  date?: React.ReactNode;
  detail?: React.ReactNode;
  /** Who logged it. */
  author?: React.ReactNode;
}

export interface ActivityTimelineProps extends React.HTMLAttributes<HTMLOListElement> {
  items: ActivityItem[];
}
export function ActivityTimeline(props: ActivityTimelineProps): JSX.Element;
