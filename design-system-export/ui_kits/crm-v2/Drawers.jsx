function A2Sheet({ onClose, short, children, label }) {
  React.useEffect(() => { const k = e => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  return (<>
    <div className="a2-scrim" onClick={onClose} />
    <div className={'a2-drawer' + (short ? ' short' : '')} role="dialog" aria-label={label}><div className="a2-grab" />{children}</div>
  </>);
}

function A2FarmDrawer({ farm, onClose, onStep, onSend }) {
  const D = window.GV_DATA;
  const ddIc = { ok: ['check', 'var(--a2-success)', 'var(--a2-success-soft)'], pending: ['clock', 'var(--a2-warning)', 'var(--a2-warning-soft)'], blocked: ['alert-triangle', 'var(--a2-danger)', 'var(--a2-danger-soft)'], empty: ['circle-dashed', 'var(--a2-ink-3)', 'var(--a2-surface-2)'] };
  const ddTone = { Concluído: 'success', 'Em análise': 'warning', Pendência: 'danger' };
  return (
    <A2Sheet onClose={onClose} label={farm.nome}>
      <div className="a2-drawer-h">
        <div className="t"><span className="mono">FAZENDA {farm.id}</span><h2>{farm.nome}</h2></div>
        <A2IconBtn icon="chevron-up" label="Anterior" onClick={() => onStep(-1)} />
        <A2IconBtn icon="chevron-down" label="Próxima" onClick={() => onStep(1)} />
        <A2IconBtn icon="x" label="Fechar" onClick={onClose} />
      </div>
      <div className="a2-drawer-b">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><A2Pill tone={farm.tone}>{farm.status}</A2Pill><A2Pill tone="gold" dot={false}>Prioridade {farm.prior.toLowerCase()}</A2Pill><span className="a2-chip">{farm.apt}</span></div>
        <div style={{ aspectRatio: '16/8', borderRadius: 'var(--a2-r-md)', background: 'repeating-linear-gradient(135deg,var(--a2-surface-2) 0 10px,var(--a2-surface-3) 10px 20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--a2-ink-3)', fontFamily: 'var(--a2-font-mono)' }}>foto aérea da propriedade</div>
        <div className="a2-mini-cards">
          <div className="a2-mini">Área total<b>{farm.area} ha</b><span>{farm.util} ha úteis</span></div>
          <div className="a2-mini">Valor por hectare<b>R$ {farm.ha}</b><span>{farm.sacas} sc/ha</span></div>
        </div>
        <div className="a2-sec"><h4>Ficha técnica</h4>
          <div className="a2-kv">
            <span>Município</span><span>{farm.mun}</span>
            <span>Região</span><span>{farm.regiao}</span>
            <span>Água</span><span>{farm.agua}</span>
            <span>Potencial irrigação</span><span>{farm.irrig}</span>
            <span>Rodovia</span><span>{farm.rodovia}</span>
            <span>Armazém</span><span>{farm.armazem}</span>
            <span>Corretor</span><span>{farm.corretor}</span>
          </div>
        </div>
        <div className="a2-sec"><h4>Due diligence <span style={{ fontWeight: 400, color: 'var(--a2-ink-3)' }}>· 2 de 5</span></h4>
          <div className="a2-dd">{D.diligence.map(d => { const [ic, c, bg] = ddIc[d.state]; return (
            <div key={d.label} className="a2-dd-row"><span className="a2-dd-ic" style={{ color: c, background: bg }}><A2Icon name={ic} size={12} /></span><span className="t">{d.label}<small>{d.meta}</small></span>{d.badge && <A2Pill tone={ddTone[d.badge]} dot={false}>{d.badge}</A2Pill>}</div>); })}</div>
        </div>
        <div className="a2-sec"><h4>Compradores compatíveis</h4>
          <div className="a2-list" style={{ padding: 0, margin: '0 -12px' }}>{D.compradores.slice(0, 3).map(b => (
            <div key={b.nome} className="a2-li"><span className="a2-avatar">{initials(b.nome)}</span><span className="t"><b>{b.nome}</b><span>{b.ticket} · {b.hectares}</span></span><A2Score v={b.score} /></div>))}</div>
        </div>
      </div>
      <div className="a2-drawer-f">
        <A2Btn variant="soft" icon="pencil">Editar</A2Btn>
        <div className="grow" />
        <A2Btn variant="dark" icon="send" onClick={onSend}>Enviar a compradores</A2Btn>
      </div>
    </A2Sheet>
  );
}

function A2Field({ label, children }) {
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, color: 'var(--a2-ink-2)' }}>{label}{children}</label>;
}
const a2Select = { height: 42, borderRadius: 12, border: 0, boxShadow: 'inset 0 0 0 1px var(--a2-line-strong)', padding: '0 12px', font: 'inherit', fontSize: 13.5, color: 'var(--a2-ink)', background: '#fff' };

function A2FilterSheet({ onClose, onApply }) {
  const [apt, setApt] = React.useState('Todas');
  return (
    <A2Sheet onClose={onClose} short label="Filtros">
      <div className="a2-drawer-h"><div className="t"><h2>Filtros</h2></div><A2IconBtn icon="x" label="Fechar" onClick={onClose} /></div>
      <div className="a2-drawer-b">
        <A2Field label="Região"><select style={a2Select} defaultValue="Oeste da Bahia"><option>Todas</option>{window.GV_DATA.regioes.map(r => <option key={r.nome}>{r.nome}</option>)}</select></A2Field>
        <A2Field label="Aptidão"><A2Seg value={apt} onChange={setApt} options={['Todas', 'Lavoura', 'Pecuária', 'Mista']} /></A2Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <A2Field label="Área mínima (ha)"><input style={a2Select} defaultValue="500" inputMode="numeric" /></A2Field>
          <A2Field label="Área máxima (ha)"><input style={a2Select} defaultValue="3.000" inputMode="numeric" /></A2Field>
        </div>
        <A2Field label="Corretor"><select style={a2Select}><option>Todos</option><option>Milson</option><option>Renata C.</option><option>Diego A.</option></select></A2Field>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}><span className="a2-check on"><A2Icon name="check" size={13} /></span>Somente documentação regular</label>
      </div>
      <div className="a2-drawer-f"><A2Btn variant="soft" onClick={onClose}>Limpar tudo</A2Btn><div className="grow" /><A2Btn variant="dark" onClick={onApply}>Aplicar filtros</A2Btn></div>
    </A2Sheet>
  );
}

Object.assign(window, { A2FarmDrawer, A2FilterSheet });
