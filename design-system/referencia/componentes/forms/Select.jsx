import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { fieldSurface } from './Input.jsx';

export function Select({ options = [], size = 'md', invalid, placeholder, style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  const h = size === 'sm' ? 'var(--control-height-sm)' : size === 'lg' ? 'var(--control-height-lg)' : 'var(--control-height)';
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', width: '100%', ...style }}>
      <select
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{
          width: '100%', height: h, padding: '0 34px 0 12px', appearance: 'none',
          color: 'var(--text-body)', borderRadius: 'var(--radius-input)', cursor: 'pointer',
          font: 'var(--weight-regular) 13.5px var(--font-sans)',
          ...fieldSurface(focus, invalid),
        }}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const opt = typeof o === 'string' ? { value: o, label: o } : o;
          return <option key={opt.value} value={opt.value}>{opt.label}</option>;
        })}
      </select>
      <Icon name="chevron-down" size={15} style={{ position: 'absolute', right: 12, color: 'var(--text-faint)', pointerEvents: 'none' }} />
    </div>
  );
}
