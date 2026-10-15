const A2Icon = ({ name, size = 18, style }) => (
  <span aria-hidden="true" style={{ width: size, height: size, flexShrink: 0, display: 'inline-block', backgroundColor: 'currentColor',
    WebkitMask: `url(https://unpkg.com/lucide-static@0.428.0/icons/${name}.svg) center/contain no-repeat`,
    mask: `url(https://unpkg.com/lucide-static@0.428.0/icons/${name}.svg) center/contain no-repeat`, ...style }} />
);

function A2Btn({ variant = '', icon, orb, size, count, children, className = '', ...rest }) {
  const cls = ['a2-btn', variant, size, orb ? 'has-orb' : '', className].join(' ');
  return (
    <button className={cls} {...rest}>
      {orb ? <span className="orb"><A2Icon name={orb} size={16} /></span> : icon && <A2Icon name={icon} size={16} />}
      {children}
      {count != null && <span className="count">{count}</span>}
    </button>
  );
}

const A2IconBtn = ({ icon, label, dot, plain, size = 18, ...rest }) => (
  <button className={'a2-iconbtn' + (plain ? ' plain' : '')} aria-label={label} title={label} {...rest}>
    <A2Icon name={icon} size={size} />{dot && <span className="dot" />}
  </button>
);

const A2Pill = ({ tone = 'neutral', dot = true, children }) => <span className={'a2-pill ' + tone}>{dot && <i />}{children}</span>;
const A2Delta = ({ v }) => <span className={'a2-delta ' + (v >= 0 ? 'up' : 'down')}><A2Icon name={v >= 0 ? 'arrow-up' : 'arrow-down'} size={11} />{Math.abs(v)}%</span>;

function A2Seg({ options, value, onChange }) {
  return (
    <div className="a2-seg" role="tablist">
      {options.map(o => {
        const id = o.id ?? o; const lbl = o.label ?? o;
        return <button key={id} role="tab" aria-selected={value === id} className={value === id ? 'on' : ''} onClick={() => onChange(id)}>{lbl}{o.n != null && <em>{o.n}</em>}</button>;
      })}
    </div>
  );
}

const A2Check = ({ on, onClick, label = 'Selecionar' }) => (
  <button className={'a2-check' + (on ? ' on' : '')} aria-label={label} aria-pressed={!!on} onClick={e => { e.stopPropagation(); onClick && onClick(); }}>
    {on && <A2Icon name="check" size={13} />}
  </button>
);

function A2Score({ v }) {
  const c = v >= 80 ? 'var(--a2-success)' : v >= 60 ? 'var(--a2-accent)' : 'var(--a2-danger)';
  return <span className="a2-score"><span className="track"><i style={{ width: v + '%', background: c }} /></span><b className="num" style={{ fontSize: 12.5, fontWeight: 600, color: c, minWidth: 22, textAlign: 'right' }}>{v}</b></span>;
}

const A2Empty = ({ icon = 'construction', title, children }) => (
  <div className="a2-empty"><span className="a2-ico" style={{ width: 48, height: 48, borderRadius: 16 }}><A2Icon name={icon} size={22} /></span><h3>{title}</h3><p>{children}</p></div>
);

const A2Head = ({ title, sub, children }) => (
  <div className="a2-head"><div><h1>{title}</h1>{sub && <p>{sub}</p>}</div><div className="a2-head-actions">{children}</div></div>
);

const initials = s => s.replace(/^(Fazenda|Família|Grupo|Fundo)\s+/i, '').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

Object.assign(window, { A2Icon, A2Btn, A2IconBtn, A2Pill, A2Delta, A2Seg, A2Check, A2Score, A2Empty, A2Head, initials });
