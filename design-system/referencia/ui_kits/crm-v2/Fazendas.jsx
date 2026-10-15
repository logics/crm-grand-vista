function A2Fazendas({ onOpenFarm, onFilters, onToast }) {
  const all = window.GV_DATA.fazendas;
  const [tab, setTab] = React.useState('all');
  const [q, setQ] = React.useState('');
  const [sel, setSel] = React.useState([]);
  const counts = s => all.filter(f => f.status === s).length;
  const tabs = [{ id: 'all', label: 'Todas', n: 128 }, { id: 'Disponível', label: 'Disponível', n: counts('Disponível') }, { id: 'Em negociação', label: 'Em negociação', n: counts('Em negociação') }, { id: 'Doc. pendente', label: 'Doc. pendente', n: counts('Doc. pendente') }, { id: 'Reservada', label: 'Reservada', n: counts('Reservada') }];
  const rows = all.filter(f => (tab === 'all' || f.status === tab) && (f.nome + f.mun + f.id).toLowerCase().includes(q.toLowerCase()));
  const toggle = id => setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const allOn = rows.length > 0 && rows.every(r => sel.includes(r.id));
  const prior = { Alta: 'danger', Média: 'warning', Baixa: 'neutral' };
  return (
    <div className="a2-page">
      <A2Head title="Fazendas" sub="128 fazendas · 84 disponíveis">
        <A2Btn icon="columns-3" className="hide-m">Colunas</A2Btn>
        <A2Btn icon="sliders-horizontal" count={2} onClick={onFilters}>Filtros</A2Btn>
        <A2Btn variant="primary" orb="plus" className="hide-m">Cadastrar fazenda</A2Btn>
      </A2Head>
      <div className="a2-card a2-strip">
        <div><span>Área total em carteira</span><b>186.420 ha</b></div>
        <div><span>Valor médio por hectare</span><b>R$ 68.400</b></div>
        <div><span>Em negociação</span><b>23</b></div>
        <div><span>Documentação pendente</span><b style={{ color: 'var(--a2-warning)' }}>11</b></div>
      </div>
      <div className="a2-card">
        <div className="a2-toolbar">
          <A2Seg value={tab} onChange={setTab} options={tabs} />
          <div className="grow hide-m" />
          <label className="a2-tsearch"><A2Icon name="search" size={15} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Nome, município ou código" /></label>
          <A2IconBtn icon="refresh-cw" label="Atualizar" plain size={16} />
          <A2IconBtn icon="download" label="Exportar lista" plain size={16} />
        </div>
        <div className="a2-twrap">
          <table className="a2-table">
            <thead><tr>
              <th style={{ width: 44 }}><A2Check on={allOn} label="Selecionar todas" onClick={() => setSel(allOn ? [] : rows.map(r => r.id))} /></th>
              <th>Fazenda</th><th>Município</th><th className="r">Área total</th><th className="r">Área útil</th><th className="r">Valor/ha</th><th>Aptidão</th><th>Corretor</th><th>Status</th><th>Prioridade</th><th className="r">Ações</th>
            </tr></thead>
            <tbody>
              {rows.map(f => (
                <tr key={f.id} className={sel.includes(f.id) ? 'sel' : ''} onClick={() => onOpenFarm(f)}>
                  <td><A2Check on={sel.includes(f.id)} onClick={() => toggle(f.id)} /></td>
                  <td><div className="name">{f.nome}</div><div className="mono">{f.id}</div></td>
                  <td style={{ color: 'var(--a2-ink-2)' }}>{f.mun}</td>
                  <td className="r">{f.area} ha</td>
                  <td className="r" style={{ color: 'var(--a2-ink-2)' }}>{f.util} ha</td>
                  <td className="r" style={{ fontWeight: 500 }}>R$ {f.ha}</td>
                  <td><span className="a2-chip">{f.apt}</span></td>
                  <td style={{ color: 'var(--a2-ink-2)' }}>{f.corretor}</td>
                  <td><A2Pill tone={f.tone}>{f.status}</A2Pill></td>
                  <td><A2Pill tone={prior[f.prior]} dot={false}>{f.prior}</A2Pill></td>
                  <td className="r"><div className="row-actions" onClick={e => e.stopPropagation()}>
                    <A2IconBtn icon="pencil" label="Editar" plain size={15} />
                    <A2IconBtn icon="send" label="Enviar a comprador" plain size={15} onClick={() => onToast('Enviado a 4 compradores compatíveis', f.nome)} />
                    <A2IconBtn icon="more-horizontal" label="Mais ações" plain size={15} />
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="a2-cards">
          {rows.map(f => (
            <div key={f.id} className={'a2-mcard' + (sel.includes(f.id) ? ' sel' : '')} onClick={() => onOpenFarm(f)}>
              <div className="r1">
                <A2Check on={sel.includes(f.id)} onClick={() => toggle(f.id)} />
                <div className="t"><b>{f.nome}</b><span className="mono">{f.id} · {f.mun}</span></div>
                <A2Pill tone={f.tone}>{f.status}</A2Pill>
              </div>
              <div className="r2"><span>Área<b>{f.area} ha</b></span><span>Valor/ha<b>R$ {f.ha}</b></span><span>Aptidão<b>{f.apt}</b></span></div>
            </div>
          ))}
          {!rows.length && <A2Empty icon="search-x" title="Nenhuma fazenda encontrada">Ajuste a busca ou troque o filtro de status.</A2Empty>}
        </div>
        {!rows.length && <div className="a2-twrap"><A2Empty icon="search-x" title="Nenhuma fazenda encontrada">Ajuste a busca ou troque o filtro de status.</A2Empty></div>}
        <div className="a2-tfoot">
          <span>1–{rows.length} de 128</span>
          <div className="a2-pager"><button className="txt hide-m">Anterior</button><button className="on">1</button><button>2</button><button>3</button><span className="hide-m">…</span><button className="hide-m">22</button><button className="txt">Próxima</button></div>
        </div>
      </div>
      {sel.length > 0 && (
        <div className="a2-bulk" role="toolbar" aria-label="Ações em lote">
          <span><b>{sel.length}</b> selecionada{sel.length > 1 ? 's' : ''}</span>
          <A2Btn size="sm" icon="user-round-cog" className="hide-m">Trocar corretor</A2Btn>
          <A2Btn size="sm" icon="download" className="hide-m">Exportar</A2Btn>
          <A2Btn size="sm" variant="primary" icon="send" onClick={() => { onToast('Oportunidade enviada', `${sel.length} fazenda(s) para compradores compatíveis`); setSel([]); }}>Enviar</A2Btn>
          <A2IconBtn icon="x" label="Limpar seleção" plain size={16} onClick={() => setSel([])} />
        </div>
      )}
    </div>
  );
}

Object.assign(window, { A2Fazendas });
