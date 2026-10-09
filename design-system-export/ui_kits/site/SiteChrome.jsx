(function(){
const { Wordmark, Button, Icon } = window.GrandVistaDesignSystem_6745fe;

function SiteHeader({ page, onNavigate }) {
  const links = [['home', 'Início'], ['listagem', 'Fazendas'], ['regioes', 'Regiões'], ['sobre', 'A Grand Vista'], ['contato', 'Contato']];
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 'var(--space-9)', height: 78, padding: '0 var(--space-10)', background: 'var(--gv-green-900)', borderBottom: '1px solid var(--border-inverse)' }}>
      <button onClick={() => onNavigate('home')} style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0 }}>
        <Wordmark size={17} tone="light" />
      </button>
      <nav style={{ display: 'flex', gap: 'var(--space-8)', marginLeft: 'var(--space-8)' }}>
        {links.map(([id, label]) => (
          <button key={id} onClick={() => onNavigate(id)} style={{
            background: 'none', border: 0, padding: '4px 0', cursor: 'pointer',
            borderBottom: '1px solid ' + (page === id ? 'var(--gv-gold-500)' : 'transparent'),
            color: page === id ? 'var(--gv-gold-300)' : 'var(--text-on-inverse)',
            font: 'var(--weight-regular) var(--size-sm)/1 var(--font-sans)',
          }}>{label}</button>
        ))}
      </nav>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', marginLeft: 'auto' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--gv-sand-200)', font: 'var(--weight-regular) var(--size-sm) var(--font-sans)' }}>
          <Icon name="phone" size={14} style={{ color: 'var(--gv-gold-400)' }} />(65) 0000-0000
        </span>
        <Button variant="accent" size="sm" icon="message-circle">Falar com corretor</Button>
      </div>
    </header>
  );
}

function SiteFooter() {
  const cols = [
    ['Fazendas', ['Lavoura', 'Pecuária', 'Mista', 'Áreas de expansão']],
    ['Regiões', ['Oeste da Bahia', 'Médio-Norte MT', 'Alto Paranaíba', 'Sul do Piauí', 'Bolsão MS']],
    ['Institucional', ['A Grand Vista', 'Como trabalhamos', 'Anuncie sua fazenda', 'Contato']],
  ];
  return (
    <footer style={{ background: 'var(--gv-green-900)', color: 'var(--text-on-inverse)', padding: 'var(--space-11) var(--space-10) var(--space-9)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr repeat(3,1fr)', gap: 'var(--space-10)', maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', alignItems: 'flex-start' }}>
          <Wordmark size={19} tone="light" />
          <p style={{ margin: 0, maxWidth: 260, font: 'var(--weight-regular) var(--size-sm)/1.6 var(--font-sans)', color: 'rgba(243,231,206,.62)' }}>
            Intermediação de fazendas de alto valor. Curadoria técnica, documentação analisada e acompanhamento do primeiro contato ao pós-venda.
          </p>
        </div>
        {cols.map(([t, items]) => (
          <div key={t} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <span className="gv-eyebrow" style={{ color: 'var(--gv-gold-400)' }}>{t}</span>
            {items.map((i) => <span key={i} style={{ font: 'var(--weight-regular) var(--size-sm) var(--font-sans)', color: 'rgba(243,231,206,.72)' }}>{i}</span>)}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-8)', maxWidth: 1240, margin: 'var(--space-10) auto 0', paddingTop: 'var(--space-6)', borderTop: '1px solid var(--border-inverse)', font: 'var(--weight-regular) var(--size-xs) var(--font-sans)', color: 'rgba(243,231,206,.45)' }}>
        <span>Grand Vista Fazendas Imobiliária · CRECI 00000-J</span>
        <span>© 2026 Grand Vista</span>
      </div>
    </footer>
  );
}

function SectionHead({ eyebrow, title, description, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 'var(--space-9)', marginBottom: 'var(--space-9)' }}>
      <div style={{ maxWidth: 620 }}>
        {eyebrow && <div className="gv-eyebrow" style={{ marginBottom: 8 }}>{eyebrow}</div>}
        <h2 style={{ fontSize: 'var(--size-display)', fontWeight: 'var(--weight-light)', letterSpacing: 'var(--tracking-tight)', lineHeight: 1.12 }}>{title}</h2>
        {description && <p style={{ margin: '12px 0 0', font: 'var(--weight-regular) var(--size-lg)/1.6 var(--font-sans)', color: 'var(--text-muted)' }}>{description}</p>}
      </div>
      {action}
    </div>
  );
}

Object.assign(window, { SiteHeader, SiteFooter, SectionHead });
})();
