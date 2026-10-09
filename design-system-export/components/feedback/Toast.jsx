import React from 'react';
import { Icon } from '../core/Icon.jsx';

const TONES = {
  success: ['check', 'var(--gv-gold-400)'],
  warning: ['alert-triangle', '#E9C27A'],
  danger: ['alert-octagon', '#F0A196'],
  info: ['info', '#A9CBE2'],
};

export function Toast({ tone = 'success', title, message, action, onClose, style, ...rest }) {
  const [icon, fg] = TONES[tone] || TONES.info;
  return (
    <div role="status" style={{
      display: 'flex', alignItems: 'center', gap: 12,
      width: 380, maxWidth: '100%', padding: '12px 12px 12px 12px', background: 'var(--surface-inverse)', color: '#fff',
      border: 0, borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', ...style,
    }} {...rest}>
      <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,.12)', color: fg, flex: '0 0 auto' }}><Icon name={icon} size={16} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ font: 'var(--weight-medium) 13px/1.3 var(--font-sans)' }}>{title}</div>}
        {message && <div style={{ font: 'var(--weight-regular) 12px/1.45 var(--font-sans)', color: 'rgba(255,255,255,.66)', marginTop: 1 }}>{message}</div>}
      </div>
      {action}
      {onClose && (
        <button aria-label="Fechar" onClick={onClose} style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, border: 0, borderRadius: '50%', background: 'transparent', color: 'rgba(255,255,255,.7)', cursor: 'pointer' }}><Icon name="x" size={14} /></button>
      )}
    </div>
  );
}
