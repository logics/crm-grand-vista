(function(){
const { Button, Select, FarmCard, Card, Icon } = window.GrandVistaDesignSystem_6745fe;

function HomeScreen({ onOpenProperty, onSearch }) {
  const d = window.GV_DATA;
  return (
    <div>
      <section style={{ position: 'relative', minHeight: 520, display: 'flex', alignItems: 'flex-end', background: 'center/cover no-repeat url(../../assets/logo-fachada-grandvista.jpeg)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'var(--scrim-bottom)' }} />
        <div style={{ position: 'relative', width: '100%', maxWidth: 1240, margin: '0 auto', padding: 'var(--space-13) var(--space-10) var(--space-10)' }}>
          <div className="gv-eyebrow" style={{ color: 'var(--gv-gold-300)' }}>Fazendas de alto valor · 9 regiões</div>
          <h1 style={{ maxWidth: 720, marginTop: 'var(--space-6)', fontSize: 'var(--size-hero)', fontWeight: 'var(--weight-light)', lineHeight: 1.08, color: 'var(--gv-sand-100)', textWrap: 'pretty' }}>
            A fazenda certa raramente está anunciada.
          </h1>
          <p style={{ maxWidth: 560, marginTop: 'var(--space-6)', font: 'var(--weight-regular) var(--size-lg)/1.6 var(--font-sans)', color: 'rgba(243,231,206,.82)' }}>
            Trabalhamos com carteira própria, análise técnica das propriedades e leitura do perfil de cada investidor antes de apresentar qualquer opção.
          </p>
        </div>
      </section>

      <section style={{ position: 'relative', maxWidth: 1240, margin: '-40px auto 0', padding: '0 var(--space-10)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-6)', padding: 'var(--space-8)', background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderTop: '2px solid var(--brand-accent)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-lg)' }}>
          {[['Região', ['Oeste da Bahia', 'Médio-Norte MT', 'Alto Paranaíba', 'Sul do Piauí', 'Bolsão MS']],
            ['Aptidão', ['Lavoura', 'Pecuária', 'Mista']],
            ['Área útil', ['Até 500 ha', '500 – 1.500 ha', '1.500 – 3.000 ha', 'Acima de 3.000 ha']],
            ['Faixa de valor', ['Até R$ 20 mi', 'R$ 20 – 50 mi', 'Acima de R$ 50 mi']]].map(([label, opts]) => (
            <label key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="gv-eyebrow">{label}</span>
              <Select placeholder="Indiferente" options={opts} />
            </label>
          ))}
          <Button size="lg" icon="search" onClick={onSearch}>Buscar fazendas</Button>
        </div>
      </section>

      <section style={{ maxWidth: 1240, margin: '0 auto', padding: 'var(--space-12) var(--space-10) 0' }}>
        <window.SectionHead eyebrow="Seleção da semana" title="Propriedades em destaque"
          description="Cada ficha traz área útil, valor por hectare, disponibilidade hídrica e situação documental verificada pela nossa equipe."
          action={<Button variant="secondary" iconRight="arrow-right" onClick={onSearch}>Ver todas as fazendas</Button>} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'var(--space-7)' }}>
          {d.fazendas.slice(0, 3).map((f) => (
            <FarmCard key={f.id} onClick={() => onOpenProperty(f)} name={f.nome} location={f.mun + ' · ' + f.regiao}
              price={'R$ ' + f.ha} priceUnit="por hectare útil" area={f.area + ' ha · ' + f.util + ' úteis'}
              status={f.status} statusTone={f.tone} featured={f.prior === 'Alta'}
              specs={[{ icon: 'droplets', value: 'Irrigação ' + f.irrig.toLowerCase() }, { icon: 'wheat', value: f.apt }]} />
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1240, margin: '0 auto', padding: 'var(--space-12) var(--space-10) 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-10)', alignItems: 'center', padding: 'var(--space-10)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-lg)' }}>
          <div>
            <div className="gv-eyebrow" style={{ marginBottom: 8 }}>Como trabalhamos</div>
            <h2 style={{ fontSize: 'var(--size-h1)', fontWeight: 'var(--weight-light)', lineHeight: 1.15 }}>Negociação consultiva, do perfil ao pós-venda</h2>
            <p style={{ margin: '14px 0 0', font: 'var(--weight-regular) var(--size-body)/1.65 var(--font-sans)', color: 'var(--text-body)' }}>
              Antes de apresentar opções, entendemos capacidade de investimento, culturas de interesse, faixa de hectares e urgência. Depois acompanhamos a due diligence jurídica, ambiental e fundiária até a assinatura.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-5)', marginTop: 'var(--space-8)' }}>
              <Button icon="calendar-clock">Agendar conversa</Button>
              <Button variant="secondary" icon="file-text">Anunciar minha fazenda</Button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
            {[['Perfil do investidor', 'Ticket, região, cultura e prazo.', 'user-search'],
              ['Curadoria', 'Só o que atende ao perfil.', 'filter'],
              ['Visita técnica', 'Solo, água, logística e sede.', 'map-pin'],
              ['Due diligence', 'Jurídico, ambiental e fundiário.', 'shield-check']].map(([t, s, ic]) => (
              <div key={t} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 'var(--space-6)', background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                <Icon name={ic} size={19} style={{ color: 'var(--gv-gold-600)' }} />
                <span style={{ font: 'var(--weight-medium) var(--size-sm) var(--font-sans)', color: 'var(--text-heading)' }}>{t}</span>
                <span style={{ font: 'var(--weight-regular) var(--size-xs)/1.5 var(--font-sans)', color: 'var(--text-muted)' }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1240, margin: '0 auto', padding: 'var(--space-12) var(--space-10) var(--space-13)' }}>
        <window.SectionHead eyebrow="Onde atuamos" title="Regiões com demanda ativa" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 'var(--space-6)' }}>
          {d.regioes.map((r) => (
            <Card key={r.nome} interactive padding="var(--space-7)">
              <div className="gv-num" style={{ fontSize: 'var(--size-h2)', color: 'var(--gv-green-700)', fontWeight: 'var(--weight-medium)' }}>{r.buscas}</div>
              <div style={{ marginTop: 4, font: 'var(--weight-medium) var(--size-sm) var(--font-sans)', color: 'var(--text-heading)' }}>{r.nome}</div>
              <div style={{ marginTop: 2, font: 'var(--weight-regular) var(--size-xs) var(--font-sans)', color: 'var(--text-faint)' }}>investidores buscando</div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

Object.assign(window, { HomeScreen });
})();
