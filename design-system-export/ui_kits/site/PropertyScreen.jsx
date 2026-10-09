(function(){
const { Button, Badge, Tag, Card, SpecList, Icon, Field, Input, Textarea, Checkbox, FarmCard, Tabs } = window.GrandVistaDesignSystem_6745fe;

function PropertyScreen({ farm, onOpenProperty, onSubmit }) {
  const d = window.GV_DATA;
  const f = farm || d.fazendas[0];
  const [tab, setTab] = React.useState('ficha');
  return (
    <div>
      <section style={{ position: 'relative', height: 420, background: 'var(--gv-sand-300)', display: 'grid', placeItems: 'center' }}>
        <span className="gv-eyebrow" style={{ color: 'var(--gv-sand-700)' }}>Galeria da propriedade · 12 fotos · 2 vídeos</span>
        <div style={{ position: 'absolute', inset: 0, background: 'var(--scrim-flat)' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
          <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 var(--space-10) var(--space-9)' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <Badge tone={f.tone} dot>{f.status}</Badge>
              <Badge tone="gold">{f.regiao}</Badge>
            </div>
            <h1 style={{ fontSize: 'var(--size-display)', fontWeight: 'var(--weight-light)', color: 'var(--gv-sand-100)', lineHeight: 1.1 }}>{f.nome}</h1>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, font: 'var(--weight-regular) var(--size-body) var(--font-sans)', color: 'rgba(243,231,206,.8)' }}>
              <Icon name="map-pin" size={15} />{f.mun}
            </span>
          </div>
        </div>
      </section>

      <div style={{ maxWidth: 1240, margin: '0 auto', padding: 'var(--space-10) var(--space-10) var(--space-13)', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 348px', gap: 'var(--space-10)', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-9)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 'var(--space-6)' }}>
            {[['Área total', f.area + ' ha'], ['Área útil', f.util + ' ha'], ['Valor por hectare útil', 'R$ ' + f.ha], ['Valor em sacas', f.sacas + ' sc/ha']].map(([l, v]) => (
              <div key={l} style={{ padding: 'var(--space-6)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-md)' }}>
                <div className="gv-eyebrow">{l}</div>
                <div className="gv-num" style={{ marginTop: 4, fontSize: 'var(--size-h3)', fontWeight: 'var(--weight-medium)', color: 'var(--gv-green-700)' }}>{v}</div>
              </div>
            ))}
          </div>

          <div>
            <Tabs active={tab} onSelect={setTab} items={[{ id: 'ficha', label: 'Ficha técnica' }, { id: 'infra', label: 'Infraestrutura' }, { id: 'doc', label: 'Documentação' }]} style={{ marginBottom: 'var(--space-8)' }} />
            {tab === 'ficha' && <SpecList columns={3} items={[
              { label: 'Aptidão', value: f.apt }, { label: 'Solo', value: 'Latossolo vermelho' }, { label: 'Topografia', value: 'Plano a suave-ondulado' },
              { label: 'Disponibilidade hídrica', value: f.agua }, { label: 'Potencial de irrigação', value: f.irrig }, { label: 'Produtividade histórica', value: '68 sc/ha', mono: true },
              { label: 'Distância de rodovias', value: f.rodovia, mono: true }, { label: 'Distância de armazéns', value: f.armazem, mono: true }, { label: 'Região', value: f.regiao },
            ]} />}
            {tab === 'infra' && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{['Sede reformada', '2 barracões', 'Energia trifásica', 'Curral', 'Poço artesiano', 'Acesso asfaltado'].map((t) => <Tag key={t} icon="check">{t}</Tag>)}</div>}
            {tab === 'doc' && <SpecList columns={2} items={[
              { label: 'Situação documental', value: f.doc }, { label: 'Matrícula', value: 'Única, sem ônus' },
              { label: 'CAR', value: 'Ativo' }, { label: 'Georreferenciamento', value: 'Concluído' },
              { label: 'Reserva legal', value: 'Averbada' }, { label: 'Passivo ambiental', value: 'Não identificado' },
            ]} />}
          </div>

          <div>
            <div className="gv-eyebrow" style={{ marginBottom: 8 }}>Sobre a propriedade</div>
            <p style={{ margin: 0, maxWidth: 680, font: 'var(--weight-regular) var(--size-body)/1.7 var(--font-sans)', color: 'var(--text-body)' }}>
              Área consolidada de grãos com talhões abertos, histórico de produtividade acima da média regional e logística curta até o armazém. A propriedade admite negociação com parte do pagamento em sacas de soja.
            </p>
          </div>

          <div style={{ height: 260, borderRadius: 'var(--radius-card)', background: 'var(--gv-sand-200)', display: 'grid', placeItems: 'center' }}>
            <span className="gv-eyebrow" style={{ color: 'var(--gv-sand-700)' }}>Mapa aproximado da região</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', position: 'sticky', top: 100 }}>
          <Card accent eyebrow="Faixa de valor" title={'R$ ' + f.ha + ' / ha útil'}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              <p style={{ margin: 0, font: 'var(--weight-regular) var(--size-sm)/1.6 var(--font-sans)', color: 'var(--text-muted)' }}>
                Fale com o corretor responsável para receber a ficha completa, laudos e o histórico de safras.
              </p>
              <Field label="Nome"><Input placeholder="Seu nome" /></Field>
              <Field label="WhatsApp"><Input placeholder="(00) 00000-0000" inputMode="tel" /></Field>
              <Field label="Mensagem" hint="Opcional"><Textarea rows={3} placeholder="Tenho interesse nesta fazenda." /></Field>
              <Checkbox label="Quero receber oportunidades semelhantes" />
              <Button variant="accent" block icon="message-circle" onClick={onSubmit}>Falar com o corretor</Button>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, font: 'var(--weight-regular) var(--size-micro) var(--font-sans)', color: 'var(--text-faint)' }}>
                <Icon name="shield-check" size={13} />Seus dados não são compartilhados.
              </span>
            </div>
          </Card>
          <Card title="Corretor responsável">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: '50%', background: 'var(--gv-green-700)', color: 'var(--gv-gold-300)', font: 'var(--weight-medium) var(--size-lg) var(--font-display)' }}>M</span>
              <div>
                <div style={{ font: 'var(--weight-medium) var(--size-sm) var(--font-sans)', color: 'var(--text-heading)' }}>{f.corretor}</div>
                <div style={{ font: 'var(--weight-regular) var(--size-xs) var(--font-sans)', color: 'var(--text-muted)' }}>Grand Vista Fazendas</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <section style={{ background: 'var(--surface-sunken)', padding: 'var(--space-12) 0' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 var(--space-10)' }}>
          <window.SectionHead eyebrow="Também na mesma faixa" title="Outras propriedades" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'var(--space-7)' }}>
            {d.fazendas.filter((x) => x.id !== f.id).slice(0, 3).map((x) => (
              <FarmCard key={x.id} onClick={() => onOpenProperty(x)} name={x.nome} location={x.mun + ' · ' + x.regiao}
                price={'R$ ' + x.ha} priceUnit="por hectare útil" area={x.area + ' ha · ' + x.util + ' úteis'}
                status={x.status} statusTone={x.tone} specs={[{ icon: 'wheat', value: x.apt }]} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

Object.assign(window, { PropertyScreen });
})();
