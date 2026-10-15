import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function DealCard({ client, farm, value, probability, owner, nextAction, overdue, onClick, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  const initials = typeof owner === 'string' ? owner.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() : null;
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', flexDirection: 'column', gap: 10,
        padding: 14, background: 'var(--surface-card)', border: 0,
        borderRadius: 'var(--radius-md)',
        boxShadow: hover ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transform: hover ? 'translateY(-1px)' : 'none',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow var(--dur-normal) var(--ease-standard), transform var(--dur-normal) var(--ease-standard)', ...style,
      }}
      {...rest}
    >
      <div>
        <div style={{ font: 'var(--weight-semibold) 13.5px/1.3 var(--font-sans)', color: 'var(--text-heading)' }}>{client}</div>
        {farm && <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2, fontSize: 12, color: 'var(--text-faint)' }}><Icon name="tractor" size={13} />{farm}</div>}
      </div>
      {(value || typeof probability === 'number') && (
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          {value && <span style={{ fontSize: 18, fontWeight: 'var(--weight-semibold)', letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums' }}>{value}</span>}
          {typeof probability === 'number' && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{probability}%</span>}
        </div>
      )}
      {typeof probability === 'number' && (
        <div style={{ height: 4, borderRadius: 2, background: 'var(--surface-sunken)', overflow: 'hidden' }}>
          <div style={{ width: probability + '%', height: '100%', borderRadius: 2, background: 'var(--brand-accent)' }} />
        </div>
      )}
      {(nextAction || owner) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 10, borderTop: '1px solid var(--border-subtle)', fontSize: 12, color: overdue ? 'var(--status-danger-fg)' : 'var(--text-muted)' }}>
          {nextAction && <><Icon name={overdue ? 'alert-circle' : 'calendar-clock'} size={13} /><span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nextAction}</span></>}
          {initials && <span title={owner} style={{ marginLeft: 'auto', width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--brand-primary-soft)', color: 'var(--brand-primary)', fontSize: 10, fontWeight: 'var(--weight-semibold)' }}>{initials}</span>}
        </div>
      )}
    </div>
  );
}
