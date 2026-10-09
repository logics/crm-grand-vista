import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { Badge } from '../core/Badge.jsx';

const STATE = {
  ok: ['check', 'var(--status-success-fg)', 'var(--status-success-bg)'],
  pending: ['clock', 'var(--status-warning-fg)', 'var(--status-warning-bg)'],
  blocked: ['alert-triangle', 'var(--status-danger-fg)', 'var(--status-danger-bg)'],
  empty: ['minus', 'var(--text-faint)', 'var(--gv-ink-50)'],
};

export function ChecklistItem({ label, meta, state = 'empty', badge, action, style, ...rest }) {
  const [icon, fg, bg] = STATE[state] || STATE.empty;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--space-5)',
      padding: 'var(--space-5) 0', borderBottom: '1px solid var(--border-subtle)', ...style,
    }} {...rest}>
      <span style={{ display: 'grid', placeItems: 'center', width: 24, height: 24, flex: '0 0 auto', background: bg, color: fg, borderRadius: 'var(--radius-sm)' }}>
        <Icon name={icon} size={14} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', font: 'var(--weight-medium) var(--size-sm)/1.3 var(--font-sans)', color: 'var(--text-body)' }}>{label}</span>
        {meta && <span style={{ display: 'block', font: 'var(--weight-regular) var(--size-xs)/1.4 var(--font-sans)', color: 'var(--text-faint)' }}>{meta}</span>}
      </span>
      {badge && (typeof badge === 'string' ? <Badge tone={state === 'ok' ? 'success' : state === 'blocked' ? 'danger' : 'warning'}>{badge}</Badge> : badge)}
      {action}
    </div>
  );
}
