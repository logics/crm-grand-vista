import React from 'react';

export function Switch({ checked, onChange, label, disabled, style, ...rest }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-5)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, ...style }} {...rest}>
      <input type="checkbox" checked={!!checked} onChange={onChange} readOnly={!onChange} disabled={disabled} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
      <span style={{
        position: 'relative', width: 36, height: 20, flex: '0 0 auto',
        background: checked ? 'var(--brand-primary)' : 'var(--gv-ink-200)',
        borderRadius: 'var(--radius-pill)', transition: 'background-color var(--dur-fast) var(--ease-standard)',
      }}>
        <span style={{
          position: 'absolute', top: 2, left: checked ? 18 : 2, width: 16, height: 16,
          background: 'var(--gv-white)', borderRadius: '50%', boxShadow: 'var(--shadow-xs)',
          transition: 'left var(--dur-fast) var(--ease-out)',
        }} />
      </span>
      {label && <span style={{ font: 'var(--weight-regular) var(--size-sm) var(--font-sans)', color: 'var(--text-body)' }}>{label}</span>}
    </label>
  );
}
