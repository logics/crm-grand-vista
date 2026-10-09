import * as React from 'react';

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode;
  /** Helper text below the control. */
  hint?: React.ReactNode;
  /** Error message; replaces hint and turns red. */
  error?: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
  children?: React.ReactNode;
}
export function Field(props: FieldProps): JSX.Element;
