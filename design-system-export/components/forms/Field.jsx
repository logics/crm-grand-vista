import React from 'react';

export function Field({ label, hint, error, required, children, htmlFor, style, ...rest }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', ...style }} {...rest}>
      {label && (
        <label htmlFor={htmlFor} style={{ font: 'var(--weight-medium) var(--size-sm)/1.3 var(--font-sans)', color: 'var(--text-body)' }}>
          {label}
          {required && <span style={{ color: 'var(--gv-danger-600)', marginLeft: 3 }}>*</span>}
        </label>
      )}
      {children}
      {(error || hint) && (
        <span style={{ font: 'var(--weight-regular) var(--size-xs)/1.4 var(--font-sans)', color: error ? 'var(--gv-danger-600)' : 'var(--text-faint)' }}>
          {error || hint}
        </span>
      )}
    </div>
  );
}
