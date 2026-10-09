import React from 'react';
import { Icon } from './Icon.jsx';

const SIZES = {
  sm: { height: 'var(--control-height-sm)', padding: '0 12px', font: '12.5px', icon: 14 },
  md: { height: 'var(--control-height)', padding: '0 16px', font: '13.5px', icon: 16 },
  lg: { height: 'var(--control-height-lg)', padding: '0 22px', font: 'var(--size-body)', icon: 18 },
};

const VARIANTS = {
  primary: { bg: 'var(--brand-primary)', hover: 'var(--brand-primary-hover)', fg: 'var(--brand-on-primary)', shadow: 'var(--shadow-primary)' },
  accent: { bg: 'var(--brand-accent)', hover: 'var(--brand-accent-hover)', fg: 'var(--brand-on-accent)', shadow: '0 8px 18px -8px rgba(166,124,58,.6)' },
  secondary: { bg: 'var(--surface-card)', hover: 'var(--surface-sunken)', fg: 'var(--text-body)', shadow: 'var(--shadow-xs)' },
  soft: { bg: 'var(--surface-sunken)', hover: 'var(--surface-muted)', fg: 'var(--text-body)', shadow: 'none' },
  dark: { bg: 'var(--surface-inverse)', hover: '#000', fg: 'var(--text-on-inverse)', shadow: 'none' },
  ghost: { bg: 'transparent', hover: 'var(--surface-sunken)', fg: 'var(--text-muted)', hoverFg: 'var(--text-body)', shadow: 'none' },
  danger: { bg: 'var(--status-danger-bg)', hover: '#F3D4CE', fg: 'var(--status-danger-fg)', shadow: 'none' },
};

export function Button({ children, variant = 'primary', size = 'md', icon, iconRight, count, block, disabled, style, ...rest }) {
  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.primary;
  const [hover, setHover] = React.useState(false);
  const [down, setDown] = React.useState(false);
  const light = variant === 'primary' || variant === 'dark';
  return (
    <button
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setDown(false); }}
      onMouseDown={() => setDown(true)}
      onMouseUp={() => setDown(false)}
      style={{
        display: block ? 'flex' : 'inline-flex', width: block ? '100%' : undefined,
        alignItems: 'center', justifyContent: 'center', gap: 'var(--space-4)',
        height: s.height, padding: s.padding, border: 0,
        font: 'var(--weight-medium) ' + s.font + '/1 var(--font-sans)',
        background: hover && !disabled ? v.hover : v.bg,
        color: hover && v.hoverFg && !disabled ? v.hoverFg : v.fg,
        borderRadius: 'var(--radius-control)', boxShadow: v.shadow,
        whiteSpace: 'nowrap', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transform: down && !disabled ? 'translateY(1px)' : 'none',
        transition: 'var(--transition-control), transform var(--dur-instant) var(--ease-standard)',
        ...style,
      }}
      {...rest}
    >
      {icon && <Icon name={icon} size={s.icon} />}
      {children}
      {count != null && (
        <span style={{ minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontVariantNumeric: 'tabular-nums', background: light ? '#fff' : 'var(--brand-primary)', color: light ? 'var(--brand-primary)' : '#fff' }}>{count}</span>
      )}
      {iconRight && <Icon name={iconRight} size={s.icon} />}
    </button>
  );
}
