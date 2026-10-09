import * as React from 'react';

export interface SelectOption { value: string; label: string }

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Strings or {value,label} pairs. */
  options?: (string | SelectOption)[];
  /** Empty first option label. */
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  invalid?: boolean;
}
export function Select(props: SelectProps): JSX.Element;
