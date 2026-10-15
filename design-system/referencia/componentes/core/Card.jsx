import React from 'react';

const TONES = {
  default: { bg: 'var(--surface-card)', fg: 'var(--text-body)', shadow: 'var(--shadow-sm)', hover: 'var(--shadow-md)', sub: 'var(--text-faint)' },
  hero: { bg: 'var(--gradient-hero)', fg: '#fff', shadow: 'var(--shadow-hero)', hover: 'var(--shadow-hero)', sub: 'rgba(255,255,255,.72)' },
  inverse: { bg: 'var(--surface-inverse)', fg: '#fff', shadow: 'none', hover: 'none', sub: 'rgba(255,255,255,.66)' },
  sunken: { bg: 'var(--surface-muted)', fg: 'var(--text-body)', shadow: 'none', hover: 'none', sub: 'var(--text-faint)' },
};

export function Card({ children, title, subtitle, eyebrow, action, padding = 'var(--gutter-card)', tone = 'default', accent = false, interactive = false, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  const t = TONES[tone] || TONES.default;
  const ring = accent ? 'inset 0 0 0 1.5px rgba(196,154,78,.55), ' : '';
  return (
    <section
      onMouseEnter={() => interactive && setHover(true)}
      onMouseLeave={() => interactive && setHover(false)}
      style={{
        background: t.bg, color: t.fg, border: 0,
        borderRadius: 'var(--radius-card)',
        boxShadow: ring + (hover ? t.hover : t.shadow),
        transform: hover ? 'translateY(-1px)' : 'none',
        transition: 'box-shadow var(--dur-normal) var(--ease-standard), transform var(--dur-normal) var(--ease-standard)',
        overflow: 'hidden', minWidth: 0, cursor: interactive ? 'pointer' : undefined, ...style,
      }}
      {...rest}
    >
      {(title || action || eyebrow) && (
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-5)', flexWrap: 'wrap', padding: '18px ' + padding + ' 0' }}>
          <div style={{ minWidth: 0 }}>
            {eyebrow && <div className="gv-eyebrow" style={{ marginBottom: 4, color: t.sub }}>{eyebrow}</div>}
            {title && <h3 style={{ fontSize: 16, fontWeight: 'var(--weight-semibold)', letterSpacing: 'var(--tracking-tight)', color: 'inherit' }}>{title}</h3>}
            {subtitle && <p style={{ margin: '3px 0 0', fontSize: 12.5, color: t.sub }}>{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div style={{ padding }}>{children}</div>
    </section>
  );
}
