import React from 'react';
import { Icon } from './Icon.jsx';

const TONES = {
  neutral: ['var(--surface-muted)', 'var(--text-muted)'],
  success: ['var(--status-success-bg)', 'var(--status-success-fg)'],
  warning: ['var(--status-warning-bg)', 'var(--status-warning-fg)'],
  danger: ['var(--status-danger-bg)', 'var(--status-danger-fg)'],
  info: ['var(--status-info-bg)', 'var(--status-info-fg)'],
  brand: ['var(--brand-primary-soft)', 'var(--brand-primary)'],
  gold: ['var(--brand-accent-soft)', 'var(--brand-accent-ink)'],
};

export function Badge({ children, tone = 'neutral', icon, dot = false, size = 'md', style, ...rest }) {
  const [bg, fg] = TONES[tone] || TONES.neutral;
  const sm = size === 'sm';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      height: sm ? 20 : 24, padding: sm ? '0 7px' : '0 10px', background: bg, color: fg,
      border: 0, borderRadius: 'var(--radius-pill)',
      font: (sm ? 'var(--weight-semibold) 11px' : 'var(--weight-medium) 12px') + '/1 var(--font-sans)',
      fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', ...style,
    }} {...rest}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />}
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  );
}
