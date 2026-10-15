import React from 'react';
import { IconButton } from '../core/IconButton.jsx';

export function Dialog({ open = true, title, eyebrow, children, footer, onClose, width = 520, sheet = false, style, ...rest }) {
  if (!open) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: sheet ? 'flex-end' : 'center', justifyContent: 'center', padding: sheet ? 0 : 'var(--space-8)', background: 'var(--scrim-modal)', backdropFilter: 'blur(2px)', zIndex: 50 }}>
      <div role="dialog" aria-modal="true" style={{
        width: '100%', maxWidth: sheet ? 'none' : width, maxHeight: sheet ? '92%' : '100%',
        display: 'flex', flexDirection: 'column', background: 'var(--surface-card)', border: 0,
        borderRadius: sheet ? 'var(--radius-sheet) var(--radius-sheet) 0 0' : 'var(--radius-xl)',
        boxShadow: 'var(--shadow-overlay)', overflow: 'hidden', ...style,
      }} {...rest}>
        {sheet && <span style={{ width: 40, height: 5, borderRadius: 3, background: 'var(--border-default)', margin: '8px auto 0', flex: '0 0 auto' }} />}
        <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-5)', padding: sheet ? '12px 16px 10px 20px' : '20px 18px 14px 24px' }}>
          <div style={{ minWidth: 0 }}>
            {eyebrow && <div className="gv-eyebrow" style={{ marginBottom: 4 }}>{eyebrow}</div>}
            {title && <h2 style={{ fontSize: 20, fontWeight: 'var(--weight-semibold)', letterSpacing: '-.02em' }}>{title}</h2>}
          </div>
          {onClose && <IconButton icon="x" label="Fechar" variant="soft" size="sm" onClick={onClose} />}
        </header>
        <div style={{ flex: 1, overflow: 'auto', padding: sheet ? '4px 20px 20px' : '4px 24px 24px' }}>{children}</div>
        {footer && (
          <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: sheet ? '12px 16px 20px' : '14px 18px', borderTop: '1px solid var(--border-subtle)' }}>
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
