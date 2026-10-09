const A2_TABS = [
  { id: 'dashboard', label: 'Início', icon: 'layout-dashboard' },
  { id: 'fazendas', label: 'Fazendas', icon: 'tractor' },
  { id: 'pipeline', label: 'Pipeline', icon: 'kanban' },
  { id: 'compradores', label: 'Compradores', icon: 'users' },
  { id: '__menu', label: 'Menu', icon: 'menu' },
];

const A2Brand = () => (
  <div className="a2-brand"><b>GRAND VISTA</b><small>Fazendas · CRM</small><span className="a2-brand-mini">GV</span></div>
);

function A2NavList({ view, onNavigate }) {
  return (
    <nav className="a2-nav" aria-label="Navegação principal">
      {window.GV_DATA.nav.map((n, i) => n.section
        ? <div key={'s' + i} className="a2-nav-sec">{n.section}</div>
        : <button key={n.id} title={n.label} className={'a2-nav-item' + (view === n.id ? ' is-active' : '')} onClick={() => onNavigate(n.id)}>
            <A2Icon name={n.icon} size={18} /><span className="lbl">{n.label}</span>{n.badge && <span className="cnt">{n.badge}</span>}
          </button>)}
    </nav>
  );
}

function A2Sidebar({ view, onNavigate }) {
  return (
    <aside className="a2-side">
      <A2Brand />
      <A2NavList view={view} onNavigate={onNavigate} />
      <div className="a2-side-foot">
        <span className="a2-avatar">MS</span>
        <span className="who">Milson<small>Diretor comercial</small></span>
      </div>
    </aside>
  );
}

function A2TopBar() {
  return (
    <header className="a2-top">
      <label className="a2-search"><A2Icon name="search" size={16} /><input placeholder="Buscar fazenda, comprador ou oportunidade" /><kbd>⌘K</kbd></label>
      <div style={{ flex: 1 }} />
      <div className="a2-top-meta"><span>Em negociação</span><b>R$ 156,9 mi</b></div>
      <div className="a2-top-meta" style={{ marginRight: 4 }}><span>Pendências</span><b>7 hoje</b></div>
      <A2IconBtn icon="calendar-clock" label="Agenda" />
      <A2IconBtn icon="bell" label="Alertas" dot />
      <div className="a2-user"><span className="a2-avatar">MS</span><span className="who">Milson<small>Diretor comercial</small></span><A2Icon name="chevron-down" size={14} style={{ color: 'var(--a2-ink-3)' }} /></div>
    </header>
  );
}

function A2MobileTop() {
  return (
    <div className="a2-mtop">
      <A2Brand />
      <A2IconBtn icon="search" label="Buscar" />
      <A2IconBtn icon="bell" label="Alertas" dot />
      <span className="a2-avatar">MS</span>
    </div>
  );
}

function A2TabBar({ view, onNavigate }) {
  const known = A2_TABS.some(t => t.id === view);
  return (
    <nav className="a2-tabbar" aria-label="Navegação">
      {A2_TABS.map(t => (
        <button key={t.id} className={(view === t.id || (t.id === '__menu' && !known)) ? 'on' : ''} onClick={() => onNavigate(t.id)}>
          <A2Icon name={t.icon} size={20} />{t.label}
        </button>
      ))}
    </nav>
  );
}

function A2MenuSheet({ view, onNavigate, onClose }) {
  return (<>
    <div className="a2-scrim" onClick={onClose} />
    <div className="a2-drawer short a2-menu-sheet" role="dialog" aria-label="Menu">
      <div className="a2-grab" />
      <div className="a2-drawer-h"><div className="t"><h2>Menu</h2></div><A2IconBtn icon="x" label="Fechar" onClick={onClose} /></div>
      <div className="a2-drawer-b" style={{ paddingTop: 0 }}><A2NavList view={view} onNavigate={id => { onNavigate(id); onClose(); }} /></div>
    </div>
  </>);
}

Object.assign(window, { A2Sidebar, A2TopBar, A2MobileTop, A2TabBar, A2MenuSheet });
