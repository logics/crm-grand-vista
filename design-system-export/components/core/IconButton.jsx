import React from 'react';
import { Icon } from './Icon.jsx';

export function IconButton({ icon, label, size = 'md', variant = 'ghost', dot = false, disabled, style, ...rest }) {
  const box = size === 'sm' ? 32 : size === 'lg' ? 48 : 40;
  const glyph = size === 'sm' ? 15 : size === 'lg' ? 20 : 17;
  const [hover, setHover] = React.useState(false);
  const V = {
    ghost: ['transparent', 'var(--surface-sunken)', 'var(--text-muted)', 'none'],
    outline: ['var(--surface-card)', 'var(--surface-sunken)', 'var(--text-muted)', 'inset 0 0 0 1px var(--border-subtle)'],
    soft: ['var(--surface-sunken)', 'var(--surface-muted)', 'var(--text-body)', 'none'],
    solid: ['var(--brand-primary)', 'var(--brand-primary-hover)', 'var(--brand-on-primary)', 'var(--shadow-primary)'],
  };
  const [bg, hbg, fg, sh] = V[variant] || V.ghost;
  return (
    <button
      aria-label={label} title={label} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
        width: box, height: box, padding: 0, border: 0, borderRadius: '50%',
        background: hover && !disabled ? hbg : bg,
        color: hover && variant !== 'solid' ? 'var(--text-body)' : fg,
        boxShadow: sh, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1,
        transition: 'var(--transition-control)', ...style,
      }}
      {...rest}
    >
      <Icon name={icon} size={glyph} />
      {dot && <span style={{ position: 'absolute', top: box * 0.22, right: box * 0.24, width: 7, height: 7, borderRadius: '50%', background: 'var(--status-danger-fg)', boxShadow: '0 0 0 2px #fff' }} />}
    </button>
  );
}
