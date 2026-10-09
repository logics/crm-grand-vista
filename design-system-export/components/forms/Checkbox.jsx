import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function Checkbox({ label, checked, onChange, disabled, description, style, ...rest }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: description ? 'flex-start' : 'center', gap: 'var(--space-5)', minHeight: 24, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1, ...style }} {...rest}>
      <input type="checkbox" checked={!!checked} onChange={onChange} readOnly={!onChange} disabled={disabled} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 18, height: 18, flex: '0 0 auto', marginTop: description ? 1 : 0,
        background: checked ? 'var(--brand-primary)' : 'var(--surface-card)',
        boxShadow: checked ? 'none' : 'inset 0 0 0 1.5px var(--border-default)',
        borderRadius: 5, color: '#fff',
        transition: 'var(--transition-control)',
      }}>
        {checked && <Icon name="check" size={13} />}
      </span>
      {(label || description) && (
        <span>
          <span style={{ font: 'var(--weight-regular) 13.5px/1.35 var(--font-sans)', color: 'var(--text-body)' }}>{label}</span>
          {description && <span style={{ display: 'block', font: 'var(--weight-regular) var(--size-xs)/1.4 var(--font-sans)', color: 'var(--text-faint)' }}>{description}</span>}
        </span>
      )}
    </label>
  );
}
