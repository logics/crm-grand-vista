(function(){
const { FarmCard, Select, Input, Button, Tag, Checkbox, Card, EmptyState } = window.GrandVistaDesignSystem_6745fe;

function ListingScreen({ onOpenProperty }) {
  const d = window.GV_DATA;
  const [q, setQ] = React.useState('');
  const [regioes, setRegioes] = React.useState([]);
  const all = [...new Set(d.fazendas.map((f) => f.regiao))];
  const toggle = (r) => setRegioes((s) => s.includes(r) ? s.filter((x) => x !== r) : [...s, r]);
  const rows = d.fazendas.filter((f) => (!q || (f.nome + f.mun).toLowerCase().includes(q.toLowerCase())) && (regioes.length === 0 || regioes.includes(f.regiao)));

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: 'var(--space-10) var(--space-10) var(--space-13)' }}>
      <div className="gv-eyebrow" style={{ marginBottom: 8 }}>Início · Fazendas</div>
      <h1 style={{ fontSize: 'var(--size-display)', fontWeight: 'var(--weight-light)', letterSpacing: 'var(--tracking-tight)' }}>Fazendas disponíveis</h1>
      <p style={{ margin: '10px 0 var(--space-9)', maxWidth: 620, font: 'var(--weight-regular) var(--size-body)/1.65 var(--font-sans)', color: 'var(--text-muted)' }}>
        {d.fazendas.length} propriedades em carteira. Valores por hectare útil, sujeitos a confirmação em visita técnica.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '268px minmax(0,1fr)', gap: 'var(--space-9)', alignItems: 'start' }}>
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)', padding: 'var(--space-8)', background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-card)', position: 'sticky', top: 100 }}>
          <div>
            <div className="gv-eyebrow" style={{ marginBottom: 10 }}>Busca</div>
            <Input icon="search" placeholder="Fazenda ou município" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div>
            <div className="gv-eyebrow" style={{ marginBottom: 10 }}>Região</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {all.map((r) => <Checkbox key={r} label={r} checked={regioes.includes(r)} onChange={() => toggle(r)} />)}
            </div>
          </div>
          <div>
            <div className="gv-eyebrow" style={{ marginBottom: 10 }}>Aptidão</div>
            <Select placeholder="Indiferente" options={['Lavoura', 'Pecuária', 'Mista']} />
          </div>
          <div>
            <div className="gv-eyebrow" style={{ marginBottom: 10 }}>Área útil</div>
            <Select placeholder="Indiferente" options={['Até 500 ha', '500 – 1.500 ha', '1.500 – 3.000 ha', 'Acima de 3.000 ha']} />
          </div>
          <div>
            <div className="gv-eyebrow" style={{ marginBottom: 10 }}>Infraestrutura</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <Checkbox label="Potencial de irrigação" />
              <Checkbox label="Armazém próprio" />
              <Checkbox label="Documentação regular" />
            </div>
          </div>
          <Button variant="ghost" size="sm" icon="rotate-ccw" onClick={() => { setQ(''); setRegioes([]); }}>Limpar filtros</Button>
        </aside>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-7)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)', flexWrap: 'wrap' }}>
            <span style={{ font: 'var(--weight-regular) var(--size-sm) var(--font-sans)', color: 'var(--text-muted)' }}>{rows.length} resultados</span>
            {regioes.map((r) => <Tag key={r} selected icon="map-pin" onRemove={() => toggle(r)}>{r}</Tag>)}
            <div style={{ width: 200, marginLeft: 'auto' }}><Select options={['Mais recentes', 'Menor R$ / ha', 'Maior área útil']} /></div>
          </div>
          {rows.length === 0 ? (
            <Card padding="0"><EmptyState icon="search-x" title="Nenhuma fazenda com esses filtros" description="Amplie a região ou fale com um corretor: parte da carteira não é publicada." action={<Button variant="accent" icon="message-circle">Falar com corretor</Button>} /></Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 'var(--space-7)' }}>
              {rows.map((f) => (
                <FarmCard key={f.id} onClick={() => onOpenProperty(f)} name={f.nome} location={f.mun + ' · ' + f.regiao}
                  price={'R$ ' + f.ha} priceUnit="por hectare útil" area={f.area + ' ha · ' + f.util + ' úteis'}
                  status={f.status} statusTone={f.tone} featured={f.prior === 'Alta'}
                  specs={[{ icon: 'droplets', value: 'Irrigação ' + f.irrig.toLowerCase() }, { icon: 'wheat', value: f.apt }, { icon: 'truck', value: f.armazem + ' do armazém' }]} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ListingScreen });
})();
