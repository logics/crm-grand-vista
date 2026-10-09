import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function EmptyState({ icon = 'inbox', title, description, action, compact = false, style, ...rest }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      padding: compact ? 'var(--space-9) var(--space-8)' : '72px var(--space-8)',
      textAlign: 'center', ...style,
    }} {...rest}>
      <span style={{ display: 'grid', placeItems: 'center', width: 48, height: 48, borderRadius: '50%', background: 'var(--surface-sunken)', color: 'var(--text-muted)' }}>
        <Icon name={icon} size={20} />
      </span>
      {title && <h3 style={{ marginTop: 8, fontSize: 17, fontWeight: 'var(--weight-semibold)' }}>{title}</h3>}
      {description && <p style={{ margin: 0, maxWidth: 380, font: 'var(--weight-regular) 13px/1.55 var(--font-sans)', color: 'var(--text-faint)', textWrap: 'pretty' }}>{description}</p>}
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  );
}
