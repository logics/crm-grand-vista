import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function Tabs({ items = [], active, onSelect, variant = 'segmented', size = 'md', style, ...rest }) {
  const seg = variant === 'segmented';
  return (
    <div role="tablist" style={seg
      ? { display: 'inline-flex', gap: 2, padding: 4, borderRadius: 'var(--radius-pill)', background: 'var(--surface-sunken)', maxWidth: '100%', overflowX: 'auto', scrollbarWidth: 'none', ...style }
      : { display: 'flex', gap: 'var(--space-7)', borderBottom: '1px solid var(--border-subtle)', overflowX: 'auto', scrollbarWidth: 'none', ...style }} {...rest}>
      {items.map((it) => {
        const on = active === it.id;
        return (
          <button key={it.id} role="tab" aria-selected={on} onClick={() => onSelect && onSelect(it.id)}
            style={seg ? {
              display: 'inline-flex', alignItems: 'center', gap: 6, flex: '0 0 auto',
              height: size === 'sm' ? 26 : 30, padding: '0 13px', border: 0, cursor: 'pointer', whiteSpace: 'nowrap',
              borderRadius: 'var(--radius-pill)', background: on ? 'var(--surface-card)' : 'transparent',
              boxShadow: on ? 'var(--shadow-xs)' : 'none',
              color: on ? 'var(--text-heading)' : 'var(--text-muted)',
              font: (on ? 'var(--weight-medium)' : 'var(--weight-regular)') + ' 12.5px/1 var(--font-sans)',
              transition: 'var(--transition-control)',
            } : {
              display: 'inline-flex', alignItems: 'center', gap: 6, flex: '0 0 auto',
              padding: '0 0 12px', background: 'none', border: 0, whiteSpace: 'nowrap',
              borderBottom: '2px solid ' + (on ? 'var(--text-heading)' : 'transparent'),
              marginBottom: -1, cursor: 'pointer',
              color: on ? 'var(--text-heading)' : 'var(--text-muted)',
              font: (on ? 'var(--weight-medium)' : 'var(--weight-regular)') + ' 13.5px/1 var(--font-sans)',
              transition: 'var(--transition-control)',
            }}>
            {it.icon && <Icon name={it.icon} size={15} />}
            {it.label}
            {it.count != null && <span style={{ fontSize: 11, color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums' }}>{it.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
