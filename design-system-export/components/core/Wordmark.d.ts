import * as React from 'react';

/**
 * Type-set brand lockup — stands in for the missing vector logo.
 * @startingPoint section="Brand" subtitle="Lockup tipográfico Grand Vista Fazendas" viewport="700x160"
 */
export interface WordmarkProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Cap height driver in px; the "Fazendas" descriptor scales from it. */
  size?: number;
  /** dark on light surfaces, light on green/photo surfaces. */
  tone?: 'dark' | 'light';
  /** Show the ruled "Fazendas" descriptor line. */
  descriptor?: boolean;
}
export function Wordmark(props: WordmarkProps): JSX.Element;
