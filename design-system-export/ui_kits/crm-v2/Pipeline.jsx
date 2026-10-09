function A2Deal({ d, onOpen }) {
  return (
    <div className="a2-deal" onClick={onOpen}>
      <div><div className="c">{d.client}</div><div className="f">{d.farm}</div></div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span className="v">{d.value}</span><span className="a2-avatar sm">{d.owner}</span></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--a2-ink-3)' }}><span>Probabilidade</span><span className="num" style={{ color: 'var(--a2-ink)' }}>{d.probability}%</span></div>
        <div className="a2-prob"><i style={{ width: d.probability + '%' }} /></div>
      </div>
      <div className={'foot' + (d.overdue ? ' late' : '')}><A2Icon name={d.overdue ? 'alert-circle' : 'calendar-clock'} size={14} />{d.nextAction}</div>
    </div>
  );
}

function A2Pipeline({ onOpenFarm }) {
  const P = window.GV_DATA.pipeline;
  const [stage, setStage] = React.useState(P[0].stage);
  const [owner, setOwner] = React.useState('all');
  const filt = ds => ds.filter(d => owner === 'all' || d.owner === owner);
  const open = () => onOpenFarm(window.GV_DATA.fazendas[0]);
  const cur = P.find(p => p.stage === stage);
  return (
    <div className="a2-page" style={{ maxWidth: 'none' }}>
      <A2Head title="Funil comercial" sub="47 oportunidades · R$ 156,9 mi em negociação">
        <A2Seg value={owner} onChange={setOwner} options={[{ id: 'all', label: 'Todos' }, { id: 'MS', label: 'Milson' }, { id: 'RC', label: 'Renata' }, { id: 'DA', label: 'Diego' }]} />
        <A2Btn variant="primary" orb="plus" className="hide-m">Nova oportunidade</A2Btn>
      </A2Head>
      <div className="a2-board">
        {P.map(p => (
          <div key={p.stage} className="a2-lane">
            <div className="a2-lane-h"><span style={{ width: 8, height: 8, borderRadius: 3, background: `var(--stage-${p.index})` }} />{p.stage}<span className="n">{filt(p.deals).length}</span><span className="v">{p.total}</span></div>
            {filt(p.deals).map(d => <A2Deal key={d.client} d={d} onOpen={open} />)}
            {!filt(p.deals).length && <div style={{ padding: '18px 8px', textAlign: 'center', fontSize: 12, color: 'var(--a2-ink-3)' }}>Nenhuma oportunidade</div>}
          </div>
        ))}
      </div>
      <div className="a2-stagepick">
        <A2Seg value={stage} onChange={setStage} options={P.map(p => ({ id: p.stage, label: p.stage, n: filt(p.deals).length }))} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--a2-ink-3)', padding: '0 4px' }}><span>Etapa {cur.index} de 10</span><span className="num" style={{ color: 'var(--a2-ink)', fontWeight: 600 }}>{cur.total}</span></div>
        <div className="lane-list">{filt(cur.deals).map(d => <A2Deal key={d.client} d={d} onOpen={open} />)}</div>
        {!filt(cur.deals).length && <div className="a2-card"><A2Empty icon="kanban" title="Nenhuma oportunidade nesta etapa">Troque a etapa ou o filtro de corretor.</A2Empty></div>}
      </div>
    </div>
  );
}

function A2Compradores({ onToast }) {
  const B = window.GV_DATA.compradores;
  const [tab, setTab] = React.useState('all');
  const tone = { Quente: 'danger', Morno: 'warning', Frio: 'info' };
  const rows = B.filter(b => tab === 'all' || b.qualificacao === tab);
  return (
    <div className="a2-page">
      <A2Head title="Compradores e investidores" sub="342 cadastrados · 38 quentes">
        <A2Btn icon="upload" className="hide-m">Importar</A2Btn>
        <A2Btn variant="primary" orb="plus" className="hide-m">Novo comprador</A2Btn>
      </A2Head>
      <div className="a2-card">
        <div className="a2-toolbar">
          <A2Seg value={tab} onChange={setTab} options={[{ id: 'all', label: 'Todos', n: 342 }, { id: 'Quente', label: 'Quentes', n: 38 }, { id: 'Morno', label: 'Mornos', n: 121 }, { id: 'Frio', label: 'Frios', n: 183 }]} />
          <div className="grow hide-m" />
          <label className="a2-tsearch"><A2Icon name="search" size={15} /><input placeholder="Nome, região ou cultura" /></label>
        </div>
        <div className="a2-twrap">
          <table className="a2-table">
            <thead><tr><th>Comprador</th><th>Ticket</th><th>Faixa de área</th><th>Regiões</th><th>Culturas</th><th>Qualificação</th><th className="r">Matching</th><th className="r">Ações</th></tr></thead>
            <tbody>{rows.map(b => (
              <tr key={b.nome}>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span className="a2-avatar">{initials(b.nome)}</span><div><div className="name">{b.nome}</div><div className="mono">{b.tipo}</div></div></div></td>
                <td style={{ fontWeight: 500 }}>{b.ticket}</td>
                <td style={{ color: 'var(--a2-ink-2)' }}>{b.hectares}</td>
                <td><div style={{ display: 'flex', gap: 4 }}>{b.regioes.map(r => <span key={r} className="a2-chip">{r}</span>)}</div></td>
                <td style={{ color: 'var(--a2-ink-2)' }}>{b.culturas.join(', ')}</td>
                <td><A2Pill tone={tone[b.qualificacao]}>{b.qualificacao}</A2Pill></td>
                <td className="r"><A2Score v={b.score} /></td>
                <td className="r"><div className="row-actions"><A2IconBtn icon="message-circle" label="WhatsApp" plain size={15} onClick={() => onToast('Mensagem aberta no WhatsApp', b.nome)} /><A2IconBtn icon="mail" label="E-mail" plain size={15} /><A2IconBtn icon="more-horizontal" label="Mais ações" plain size={15} /></div></td>
              </tr>))}</tbody>
          </table>
        </div>
        <div className="a2-cards">{rows.map(b => (
          <div key={b.nome} className="a2-mcard">
            <div className="r1"><span className="a2-avatar">{initials(b.nome)}</span><div className="t"><b>{b.nome}</b><span className="mono">{b.tipo} · {b.regioes.join(', ')}</span></div><A2Pill tone={tone[b.qualificacao]}>{b.qualificacao}</A2Pill></div>
            <div className="r2"><span>Ticket<b>{b.ticket}</b></span><span>Área<b>{b.hectares.replace(' ha', '')}</b></span><span>Matching<b><A2Score v={b.score} /></b></span></div>
          </div>))}</div>
      </div>
    </div>
  );
}

Object.assign(window, { A2Pipeline, A2Compradores });
