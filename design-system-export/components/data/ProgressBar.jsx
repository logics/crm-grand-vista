import React from 'react';

export function ProgressBar({ value = 0, label, valueLabel, tone = 'brand', height = 6, style, ...rest }) {
  const pct = Math.max(0, Math.min(100, value));
  const fill = tone === 'gold' ? 'var(--brand-accent)' : tone === 'success' ? 'var(--gv-success-600)' : tone === 'danger' ? 'var(--gv-danger-600)' : 'var(--brand-primary)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', ...style }} {...rest}>
      {(label || valueLabel) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-5)' }}>
          {label && <span style={{ font: 'var(--weight-regular) var(--size-xs) var(--font-sans)', color: 'var(--text-muted)' }}>{label}</span>}
          {valueLabel && <span className="gv-num" style={{ fontSize: 'var(--size-xs)', color: 'var(--text-body)' }}>{valueLabel}</span>}
        </div>
      )}
      <div style={{ height, background: 'var(--gv-ink-100)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', background: fill, borderRadius: 'var(--radius-pill)', transition: 'width var(--dur-slow) var(--ease-out)' }} />
      </div>
    </div>
  );
}
