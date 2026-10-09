import React from 'react';

export function MatchScore({ value = 0, size = 'md', showLabel = true, style, ...rest }) {
  const pct = Math.max(0, Math.min(100, value));
  const tone = pct >= 80 ? 'var(--gv-success-600)' : pct >= 55 ? 'var(--gv-gold-600)' : 'var(--gv-ink-400)';
  const label = pct >= 80 ? 'Alta compatibilidade' : pct >= 55 ? 'Compatibilidade média' : 'Compatibilidade baixa';
  const dim = size === 'sm' ? 34 : size === 'lg' ? 60 : 44;
  const stroke = size === 'sm' ? 3 : size === 'lg' ? 5 : 4;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-5)', ...style }} {...rest}>
      <div style={{
        width: dim, height: dim, borderRadius: '50%', display: 'grid', placeItems: 'center',
        background: `conic-gradient(${tone} ${pct}%, var(--gv-ink-100) 0)`,
      }}>
        <div style={{
          width: dim - stroke * 2, height: dim - stroke * 2, borderRadius: '50%',
          background: 'var(--surface-card)', display: 'grid', placeItems: 'center',
        }}>
          <span className="gv-num" style={{ fontSize: size === 'sm' ? 11 : size === 'lg' ? 17 : 13, fontWeight: 'var(--weight-medium)', color: tone }}>{pct}</span>
        </div>
      </div>
      {showLabel && (
        <span style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ font: 'var(--weight-medium) var(--size-sm)/1.2 var(--font-sans)', color: 'var(--text-body)' }}>{label}</span>
          <span style={{ font: 'var(--weight-regular) var(--size-xs)/1.3 var(--font-sans)', color: 'var(--text-faint)' }}>Matching por região, área e ticket</span>
        </span>
      )}
    </div>
  );
}
