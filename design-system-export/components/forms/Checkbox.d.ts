import * as React from 'react';

export interface CheckboxProps extends Omit<React.HTMLAttributes<HTMLLabelElement>, 'onChange'> {
  label?: React.ReactNode;
  /** Secondary line under the label. */
  description?: React.ReactNode;
  checked?: boolean;
  disabled?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}
export function Checkbox(props: CheckboxProps): JSX.Element;
