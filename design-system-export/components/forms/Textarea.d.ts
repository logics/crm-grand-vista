import * as React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  rows?: number;
}
export function Textarea(props: TextareaProps): JSX.Element;
