import React from 'react';
import { Icon } from '../core/Icon.jsx';

const KIND = { visita: 'map-pin', reuniao: 'users', ligacao: 'phone', mensagem: 'message-circle', email: 'mail', nota: 'sticky-note', sistema: 'refresh-cw' };

export function ActivityTimeline({ items = [], style, ...rest }) {
  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', ...style }} {...rest}>
      {items.map((it, i) => (
        <li key={i} style={{ display: 'flex', gap: 'var(--space-5)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto' }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: '50%', background: 'var(--gv-green-50)', color: 'var(--gv-green-600)', border: '1px solid var(--gv-green-100)' }}>
              <Icon name={KIND[it.kind] || 'circle'} size={13} />
            </span>
            {i < items.length - 1 && <span style={{ flex: 1, width: 1, background: 'var(--border-default)' }} />}
          </div>
          <div style={{ paddingBottom: i < items.length - 1 ? 'var(--space-7)' : 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-5)' }}>
              <span style={{ font: 'var(--weight-medium) var(--size-sm)/1.35 var(--font-sans)', color: 'var(--text-body)' }}>{it.title}</span>
              <span className="gv-num" style={{ fontSize: 'var(--size-micro)', color: 'var(--text-faint)' }}>{it.date}</span>
            </div>
            {it.detail && <p style={{ margin: '2px 0 0', font: 'var(--weight-regular) var(--size-xs)/1.5 var(--font-sans)', color: 'var(--text-muted)' }}>{it.detail}</p>}
            {it.author && <span style={{ font: 'var(--weight-regular) var(--size-micro) var(--font-sans)', color: 'var(--text-faint)' }}>{it.author}</span>}
          </div>
        </li>
      ))}
    </ol>
  );
}
