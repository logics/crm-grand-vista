import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function SidebarNav({ items = [], active, onSelect, footer, collapsed = false, style, ...rest }) {
  return (
    <nav style={{
      display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden',
      width: collapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)',
      flex: '0 0 auto', background: 'var(--surface-card)',
      borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-sm)', ...style,
    }} {...rest}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: collapsed ? 'center' : 'flex-start', gap: 2, padding: collapsed ? '16px 0 12px' : '22px 22px 18px' }}>
        {collapsed ? (
          <span style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--brand-primary)', color: 'var(--gv-gold-100)', display: 'grid', placeItems: 'center', font: 'var(--weight-medium) 14px/1 var(--font-display)', letterSpacing: '.06em' }}>GV</span>
        ) : (
          <>
            <b style={{ font: 'var(--weight-medium) 15px/1.2 var(--font-display)', letterSpacing: 'var(--tracking-brand)', color: 'var(--brand-primary)' }}>GRAND VISTA</b>
            <small style={{ font: '10px/1.2 var(--font-display)', letterSpacing: '.3em', textTransform: 'uppercase', color: 'var(--brand-accent-ink)' }}>Fazendas</small>
          </>
        )}
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: collapsed ? '4px 10px 10px' : '4px 12px 12px', display: 'flex', flexDirection: 'column', gap: 2, flex: 1, overflowY: 'auto' }}>
        {items.map((it) => it.section ? (
          collapsed
            ? <li key={it.section} aria-hidden="true" style={{ height: 1, margin: '10px 8px', background: 'var(--border-subtle)' }} />
            : <li key={it.section} style={{ padding: '16px 12px 6px', fontSize: 11, color: 'var(--text-faint)' }}>{it.section}</li>
        ) : (
          <li key={it.id}>
            <NavItem item={it} active={active === it.id} collapsed={collapsed} onSelect={onSelect} />
          </li>
        ))}
      </ul>
      {footer && <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 10, padding: 14, borderTop: '1px solid var(--border-subtle)' }}>{footer}</div>}
    </nav>
  );
}

function NavItem({ item, active, collapsed, onSelect }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={() => onSelect && onSelect(item.id)}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      title={collapsed ? item.label : undefined} aria-current={active ? 'page' : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%',
        height: 40, padding: collapsed ? 0 : '0 12px', justifyContent: collapsed ? 'center' : 'flex-start',
        background: active ? 'var(--surface-inverse)' : hover ? 'var(--surface-sunken)' : 'transparent',
        color: active ? '#fff' : hover ? 'var(--text-body)' : 'var(--text-muted)',
        boxShadow: active ? 'var(--shadow-nav-active)' : 'none',
        border: 0, borderRadius: 'var(--radius-nav)', cursor: 'pointer',
        font: 'var(--weight-regular) 14px/1 var(--font-sans)',
        textAlign: 'left', transition: 'var(--transition-control)',
      }}
    >
      <Icon name={item.icon} size={18} />
      {!collapsed && <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
      {!collapsed && item.badge != null && (
        <span style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', color: active ? 'rgba(255,255,255,.6)' : 'var(--text-faint)' }}>{item.badge}</span>
      )}
    </button>
  );
}
