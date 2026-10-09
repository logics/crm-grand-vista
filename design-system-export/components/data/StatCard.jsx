import React from 'react';
import { Icon } from '../core/Icon.jsx';

const TONES = {
  default: { bg: 'var(--surface-card)', fg: 'var(--text-heading)', sub: 'var(--text-muted)', faint: 'var(--text-faint)', shadow: 'var(--shadow-sm)', chip: 'var(--surface-sunken)' },
  hero: { bg: 'var(--gradient-hero)', fg: '#fff', sub: 'rgba(255,255,255,.72)', faint: 'rgba(255,255,255,.6)', shadow: 'var(--shadow-hero)', chip: 'rgba(255,255,255,.14)' },
  dark: { bg: 'var(--surface-inverse)', fg: '#fff', sub: 'rgba(255,255,255,.72)', faint: 'rgba(255,255,255,.6)', shadow: 'var(--shadow-hero)', chip: 'rgba(255,255,255,.12)' },
  gold: { bg: 'var(--gradient-gold)', fg: 'var(--gv-green-900)', sub: 'rgba(18,36,27,.72)', faint: 'rgba(18,36,27,.6)', shadow: '0 18px 40px -18px rgba(166,124,58,.7)', chip: 'rgba(18,36,27,.1)' },
};

export function StatCard({ label, value, unit, delta, deltaTone = 'success', icon, footnote, rows, tone = 'default', style, ...rest }) {
  const t = TONES[tone] || TONES.default;
  const filled = tone !== 'default';
  const dBg = filled ? t.chip : deltaTone === 'danger' ? 'var(--status-danger-bg)' : deltaTone === 'neutral' ? 'var(--surface-muted)' : 'var(--status-success-bg)';
  const dFg = filled ? t.fg : deltaTone === 'danger' ? 'var(--status-danger-fg)' : deltaTone === 'neutral' ? 'var(--text-muted)' : 'var(--status-success-fg)';
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0,
      padding: '18px var(--gutter-card)', background: t.bg, color: t.fg,
      border: 0, borderRadius: 'var(--radius-card)', boxShadow: t.shadow, ...style,
    }} {...rest}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-5)', fontSize: 13, color: t.sub }}>
        <span>{label}</span>
        {icon && <span style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: '50%', background: t.chip, color: filled ? t.fg : 'var(--text-muted)' }}><Icon name={icon} size={16} /></span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: 30, fontWeight: 'var(--weight-semibold)', lineHeight: 1, letterSpacing: 'var(--tracking-display)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
          {unit && <span style={{ fontSize: 13, color: t.sub }}>{unit}</span>}
        </span>
        {delta && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, height: 20, padding: '0 7px', borderRadius: 'var(--radius-pill)', background: dBg, color: dFg, fontSize: 11, fontWeight: 'var(--weight-semibold)', fontVariantNumeric: 'tabular-nums' }}>
            <Icon name={deltaTone === 'danger' ? 'arrow-down-right' : 'arrow-up-right'} size={12} />{delta}
          </span>
        )}
      </div>
      {rows && rows.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 12px', fontSize: 12, color: t.faint }}>
          {rows.map((r, i) => (
            <React.Fragment key={i}><span>{r.label}</span><span style={{ textAlign: 'right', color: t.fg, fontWeight: 'var(--weight-medium)', fontVariantNumeric: 'tabular-nums' }}>{r.value}</span></React.Fragment>
          ))}
        </div>
      )}
      {footnote && <span style={{ fontSize: 12, color: t.faint }}>{footnote}</span>}
    </div>
  );
}
