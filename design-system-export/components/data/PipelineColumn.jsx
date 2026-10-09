import React from 'react';

export function PipelineColumn({ stage, index = 1, count, total, children, style, ...rest }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: '0 0 296px', minWidth: 0, padding: 8, background: 'var(--surface-muted)', borderRadius: 'var(--radius-lg)', ...style }} {...rest}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px 6px', font: 'var(--weight-semibold) 13px/1.2 var(--font-sans)', color: 'var(--text-heading)' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--stage-' + index + ')', flex: '0 0 auto' }} />
        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stage}</span>
        {typeof count === 'number' && <span style={{ fontSize: 11, fontWeight: 'var(--weight-medium)', color: 'var(--text-faint)', background: 'var(--surface-card)', borderRadius: 9, padding: '1px 7px', fontVariantNumeric: 'tabular-nums' }}>{count}</span>}
        {total && <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 'var(--weight-medium)', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{total}</span>}
      </header>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 96 }}>
        {children}
      </div>
    </div>
  );
}
