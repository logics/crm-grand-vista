import React from 'react';

export function SpecList({ items = [], columns = 2, style, ...rest }) {
  return (
    <dl style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))`, gap: 'var(--space-5) var(--space-9)', margin: 0, ...style }} {...rest}>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)' }}>
          <dt className="gv-eyebrow">{it.label}</dt>
          <dd style={{ margin: 0, font: `var(--weight-medium) var(--size-sm) ${it.mono ? 'var(--font-mono)' : 'var(--font-sans)'}`, color: 'var(--text-body)' }}>{it.value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
