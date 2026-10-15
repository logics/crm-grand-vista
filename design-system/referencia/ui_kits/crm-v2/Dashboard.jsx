const A2_SERIES = {
  leads: { label: 'Leads', max: 40, ticks: ['40', '30', '20', '10'], fmt: v => v, base: [12,18,15,22,9,7,19,24,21,26,14,8,11,23,27,25,29,17,10,13,28,31,26,34,0,0,0,0,0,0,0], prev: [10,14,13,18,8,6,15,20,19,21,12,9,10,18,22,20,23,15,9,11,22,24,21,25,23,19,12,10,20,22,18] },
  visitas: { label: 'Visitas', max: 8, ticks: ['8', '6', '4', '2'], fmt: v => v, base: [2,3,1,4,0,0,3,5,2,4,1,0,1,3,6,4,5,2,0,1,4,5,3,6,0,0,0,0,0,0,0], prev: [1,2,2,3,0,0,2,3,2,3,1,0,1,2,4,3,3,2,0,1,3,4,2,4,3,2,1,0,2,3,2] },
  propostas: { label: 'Propostas', max: 4, ticks: ['4', '3', '2', '1'], fmt: v => v, base: [0,1,0,1,0,0,1,2,1,0,1,0,0,1,2,1,3,1,0,0,1,2,1,3,0,0,0,0,0,0,0], prev: [0,1,0,0,0,0,1,1,1,0,0,0,0,1,1,1,2,0,0,0,1,1,1,2,1,1,0,0,1,1,1] },
};
const A2_TODAY = 24;

function A2Kpi({ label, value, delta, rows, hero, heroStyle }) {
  return (
    <div className={'a2-card a2-kpi' + (hero ? ' hero ' + heroStyle : '')}>
      <div className="a2-kpi-top"><span>{label}</span><span className="a2-tag-mini">{hero ? 'Destaque' : 'Julho'}</span></div>
      <div className="a2-kpi-val"><b>{value}</b>{delta != null && <A2Delta v={delta} />}</div>
      <div className="a2-kpi-rows">{rows.flatMap(([k, v]) => [<span key={k}>{k}</span>, <span key={k + 'v'}>{v}</span>])}</div>
    </div>
  );
}

function A2Chart() {
  const [metric, setMetric] = React.useState('leads');
  const [hover, setHover] = React.useState(A2_TODAY);
  const s = A2_SERIES[metric];
  const d = hover - 1;
  const diff = s.prev[d] ? Math.round((s.base[d] - s.prev[d]) / s.prev[d] * 100) : 0;
  return (
    <div className="a2-card">
      <div className="a2-card-h">
        <div><h3>Evolução comercial</h3><p>Diário · julho vs. junho</p></div>
        <A2Seg value={metric} onChange={setMetric} options={Object.entries(A2_SERIES).map(([id, v]) => ({ id, label: v.label }))} />
      </div>
      <div className="a2-card-h" style={{ paddingTop: 12 }}>
        <div className="a2-legend"><span><i style={{ background: 'var(--a2-primary)' }} />Julho</span><span><i style={{ background: 'var(--a2-accent)', height: 3, borderRadius: 2, verticalAlign: 3 }} />Junho</span><span><i style={{ background: 'repeating-linear-gradient(135deg,#F6F5F1 0 3px,#DCD9D0 3px 5px)' }} />Restante do mês</span></div>
      </div>
      <div className="a2-chart">
        <div className="a2-yaxis">{s.ticks.map(t => <span key={t}>{t}</span>)}<span>0</span></div>
        <div className="a2-bars-scroll">
          <div className="a2-bars" onMouseLeave={() => setHover(A2_TODAY)}>
            {s.base.map((v, i) => {
              const day = i + 1; const fut = day > A2_TODAY;
              const h = fut ? 100 : Math.max(3, v / s.max * 100);
              const cls = 'a2-bar' + (day === A2_TODAY ? ' cur' : fut ? ' fut' : day === hover ? ' hl' : '');
              return (
                <div key={i} className={cls} onMouseEnter={() => !fut && setHover(day)}>
                  <div className="col" style={{ height: h + '%' }} />
                  {!fut && <span className="prev" style={{ bottom: s.prev[i] / s.max * 100 + '%' }} />}
                  <span className="x">{String(day).padStart(2, '0')}</span>
                  {day === hover && !fut && (
                    <div className="a2-tip" style={{ left: i < 4 ? 0 : i > 26 ? 'auto' : '50%', right: i > 26 ? 0 : 'auto', transform: i < 4 || i > 26 ? 'none' : 'translateX(-50%)' }}>
                      <b>{String(day).padStart(2, '0')}/07/2026</b>
                      <div className="r"><span>Julho</span><span>{s.fmt(v)}</span></div>
                      <div className="r"><span>Junho</span><span>{s.fmt(s.prev[i])}</span></div>
                      <span><A2Delta v={diff} /> <span style={{ color: 'var(--a2-ink-3)' }}>vs. mês anterior</span></span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function A2Dashboard({ heroStyle, onOpenFarm, onNavigate }) {
  const D = window.GV_DATA;
  const [period, setPeriod] = React.useState('mes');
  const maxPct = Math.max(...D.pipeline.map(p => p.pct));
  const icons = { visita: 'map-pin', mensagem: 'message-circle', ligacao: 'phone', nota: 'sticky-note' };
  return (
    <div className="a2-page">
      <A2Head title="Visão geral" sub="Todas as regiões · atualizado às 14h30">
        <span className="hide-m"><A2Seg value={period} onChange={setPeriod} options={[{ id: 'sem', label: 'Semana' }, { id: 'mes', label: 'Mês' }, { id: 'tri', label: 'Trimestre' }]} /></span>
        <A2Btn icon="download" className="hide-m">Exportar</A2Btn>
        <A2Btn variant="primary" orb="sliders-horizontal" count={2}>Filtros</A2Btn>
      </A2Head>
      <div className="a2-kpis">
        <A2Kpi label="Fazendas ativas" value="128" delta={6} rows={[['Novas no mês', '9'], ['Disponíveis', '84'], ['Doc. pendente', '11']]} />
        <A2Kpi label="Compradores qualificados" value="342" delta={12} rows={[['Quentes', '38'], ['Mornos', '121'], ['Frios', '183']]} />
        <A2Kpi hero heroStyle={heroStyle} label="Valor em negociação" value="R$ 156,9 mi" delta={19} rows={[['Oportunidades', '47'], ['Ticket médio', 'R$ 3,3 mi'], ['Previsão de fechamento', 'R$ 26,9 mi']]} />
        <A2Kpi label="Taxa de conversão" value="4,8%" delta={-2} rows={[['Lead → visita', '22%'], ['Visita → proposta', '41%'], ['Proposta → fechamento', '53%']]} />
      </div>
      <div className="a2-grid-2">
        <A2Chart />
        <div className="a2-card">
          <div className="a2-card-h"><div><h3>Funil por etapa</h3><p>Valor em cada fase</p></div><A2Btn variant="ghost" size="sm" onClick={() => onNavigate('pipeline')}>Ver pipeline</A2Btn></div>
          <div className="a2-funnel">
            {D.pipeline.map(p => (
              <div key={p.stage} className="a2-funnel-row"><span>{p.stage}</span><b>{p.total}</b><span className="bar"><i style={{ width: p.pct / maxPct * 100 + '%', opacity: .35 + p.index / 14 }} /></span></div>
            ))}
          </div>
        </div>
      </div>
      <div className="a2-grid-2">
        <div className="a2-card">
          <div className="a2-card-h"><div><h3>Fazendas em destaque</h3><p>Prioridade alta · mais buscadas</p></div><A2Btn variant="ghost" size="sm" onClick={() => onNavigate('fazendas')}>Ver todas</A2Btn></div>
          <div className="a2-list">
            {D.fazendas.filter(f => f.prior === 'Alta').map(f => (
              <div key={f.id} className="a2-li" onClick={() => onOpenFarm(f)}>
                <span className="a2-ico"><A2Icon name="tractor" size={17} /></span>
                <span className="t"><b>{f.nome}</b><span>{f.mun} · {f.area} ha</span></span>
                <span className="num" style={{ fontSize: 13, fontWeight: 500 }}>R$ {f.ha}/ha</span>
                <A2Pill tone={f.tone}>{f.status}</A2Pill>
              </div>
            ))}
          </div>
        </div>
        <div className="a2-card">
          <div className="a2-card-h"><div><h3>Atividade recente</h3></div></div>
          <div className="a2-list">
            {D.atividades.map(a => (
              <div key={a.title} className="a2-li"><span className="a2-ico"><A2Icon name={icons[a.kind]} size={16} /></span><span className="t"><b>{a.title}</b><span>{a.date} · {a.author}</span></span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { A2Dashboard });
