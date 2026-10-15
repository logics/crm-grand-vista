import React from 'react';
import { Icon } from './Icon.jsx';

export function Tag({ children, onRemove, icon, selected = false, style, ...rest }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 'var(--space-3)',
      height: 26, padding: onRemove ? '0 6px 0 10px' : '0 10px',
      background: selected ? 'var(--brand-primary-soft)' : 'var(--surface-sunken)',
      color: selected ? 'var(--brand-primary)' : 'var(--text-muted)',
      border: 0, borderRadius: 8,
      font: (selected ? 'var(--weight-medium)' : 'var(--weight-regular)') + ' 12px/1 var(--font-sans)', whiteSpace: 'nowrap', ...style,
    }} {...rest}>
      {icon && <Icon name={icon} size={13} />}
      {children}
      {onRemove && (
        <button onClick={onRemove} aria-label="Remover" style={{ display: 'inline-flex', padding: 2, marginLeft: 2, background: 'none', border: 0, borderRadius: '50%', color: 'inherit', opacity: 0.7, cursor: 'pointer' }}>
          <Icon name="x" size={12} />
        </button>
      )}
    </span>
  );
}
