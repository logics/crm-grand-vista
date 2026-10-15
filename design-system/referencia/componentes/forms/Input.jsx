import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function fieldSurface(focus, invalid) {
  return {
    background: focus ? 'var(--surface-card)' : 'var(--surface-sunken)',
    boxShadow: invalid
      ? 'inset 0 0 0 1px var(--status-danger-fg)' + (focus ? ', var(--ring-danger)' : '')
      : focus ? 'inset 0 0 0 1px var(--brand-accent), var(--ring-focus)' : 'inset 0 0 0 1px transparent',
    border: 0, outline: 'none',
    transition: 'var(--transition-control)',
  };
}

export function Input({ icon, prefix, suffix, invalid, size = 'md', pill = false, style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  const h = size === 'sm' ? 'var(--control-height-sm)' : size === 'lg' ? 'var(--control-height-lg)' : 'var(--control-height)';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--space-4)', height: h,
      padding: pill ? '0 14px' : '0 12px', borderRadius: pill ? 'var(--radius-pill)' : 'var(--radius-input)',
      ...fieldSurface(focus, invalid), ...style,
    }}>
      {icon && <Icon name={icon} size={15} style={{ color: 'var(--text-faint)' }} />}
      {prefix && <span style={{ font: 'var(--weight-regular) var(--size-sm) var(--font-sans)', color: 'var(--text-faint)' }}>{prefix}</span>}
      <input
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{
          flex: 1, minWidth: 0, height: '100%', border: 0, outline: 'none', background: 'transparent',
          font: 'var(--weight-regular) ' + (size === 'lg' ? 'var(--size-body)' : '13.5px') + ' var(--font-sans)',
          color: 'var(--text-body)',
        }}
        {...rest}
      />
      {suffix && <span style={{ font: 'var(--weight-regular) var(--size-xs) var(--font-sans)', color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>{suffix}</span>}
    </div>
  );
}
