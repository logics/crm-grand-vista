import * as React from 'react';

export interface FarmSpec { icon: string; value: React.ReactNode }

/**
 * Property card for listings, matching results and the public site.
 * @startingPoint section="Data" subtitle="Card de fazenda com foto, valor e ficha técnica" viewport="700x400"
 */
export interface FarmCardProps extends React.HTMLAttributes<HTMLElement> {
  name: React.ReactNode;
  /** "Município, UF · Região". */
  location?: React.ReactNode;
  /** Pre-formatted price, e.g. "R$ 62.000". */
  price?: React.ReactNode;
  /** Qualifier under the price. Default "por hectare". */
  priceUnit?: React.ReactNode;
  /** Área total/útil string, e.g. "1.480 ha · 1.120 úteis". */
  area?: React.ReactNode;
  /** Up to 3 icon+value technical highlights. */
  specs?: FarmSpec[];
  status?: React.ReactNode;
  statusTone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'gold';
  /** Photo URL, shown inset with 14px radius; without it a stone placeholder is shown. */
  image?: string;
  /** Destaque listing: gold inner ring + "Destaque" badge. */
  featured?: boolean;
}
export function FarmCard(props: FarmCardProps): JSX.Element;
