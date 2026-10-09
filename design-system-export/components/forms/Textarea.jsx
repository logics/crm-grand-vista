import React from 'react';
import { fieldSurface } from './Input.jsx';

export function Textarea({ invalid, rows = 4, style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <textarea
      rows={rows}
      onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      style={{
        width: '100%', padding: '10px 12px', resize: 'vertical',
        color: 'var(--text-body)', borderRadius: 'var(--radius-input)',
        font: 'var(--weight-regular) 13.5px/var(--lh-normal) var(--font-sans)',
        ...fieldSurface(focus, invalid), ...style,
      }}
      {...rest}
    />
  );
}
