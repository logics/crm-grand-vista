import React from 'react';

export function TopBar({ title, breadcrumb, search, actions, style, ...rest }) {
  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: 'var(--space-6)',
      height: 'var(--topbar-height)', flex: '0 0 auto',
      padding: '0 12px 0 20px', background: 'var(--surface-card)',
      borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-sm)', ...style,
    }} {...rest}>
      {(breadcrumb || title) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          {breadcrumb && <span style={{ fontSize: 12, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>{breadcrumb}</span>}
          {title && <h1 style={{ fontSize: 16, fontWeight: 'var(--weight-semibold)', letterSpacing: 'var(--tracking-tight)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h1>}
        </div>
      )}
      {search && <div style={{ flex: '0 1 340px', minWidth: 0, marginLeft: title || breadcrumb ? 'auto' : 0 }}>{search}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>{actions}</div>
    </header>
  );
}
