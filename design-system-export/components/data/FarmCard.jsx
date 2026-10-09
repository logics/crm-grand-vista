import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { Badge } from '../core/Badge.jsx';

export function FarmCard({ name, location, price, priceUnit = 'por hectare', area, specs = [], status, statusTone = 'success', image, featured, onClick, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  return (
    <article
      onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: 'var(--surface-card)', border: 0, padding: 8,
        borderRadius: 'var(--radius-card)',
        boxShadow: (featured ? 'inset 0 0 0 1.5px rgba(196,154,78,.55), ' : '') + (hover ? 'var(--shadow-md)' : 'var(--shadow-sm)'),
        transform: hover ? 'translateY(-1px)' : 'none',
        transition: 'box-shadow var(--dur-normal) var(--ease-standard), transform var(--dur-normal) var(--ease-standard)',
        cursor: onClick ? 'pointer' : 'default', ...style,
      }}
      {...rest}
    >
      <div style={{
        position: 'relative', height: 168, borderRadius: 'var(--radius-md)', overflow: 'hidden',
        background: image ? 'center/cover no-repeat url(' + image + ')' : 'var(--surface-muted)',
        display: 'grid', placeItems: 'center',
      }}>
        {!image && <span className="gv-eyebrow">Foto da propriedade</span>}
        {status && <div style={{ position: 'absolute', top: 10, left: 10 }}><Badge tone={statusTone} dot style={{ background: '#fff', boxShadow: 'var(--shadow-xs)' }}>{status}</Badge></div>}
        {featured && <div style={{ position: 'absolute', top: 10, right: 10 }}><Badge tone="gold">Destaque</Badge></div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: '12px 10px 8px' }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 'var(--weight-semibold)', letterSpacing: 'var(--tracking-tight)' }}>{name}</h3>
          {location && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2, font: 'var(--weight-regular) 12.5px var(--font-sans)', color: 'var(--text-faint)' }}>
              <Icon name="map-pin" size={13} />{location}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, paddingTop: 'var(--space-2)' }}>
          <span className="gv-num" style={{ fontSize: 18, color: 'var(--text-heading)', fontWeight: 'var(--weight-semibold)', letterSpacing: '-.02em' }}>{price}</span>
          <span style={{ font: 'var(--weight-regular) var(--size-xs) var(--font-sans)', color: 'var(--text-faint)' }}>{priceUnit}</span>
        </div>
        {(area || specs.length > 0) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-5)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)' }}>
            {area && <Spec icon="ruler" value={area} />}
            {specs.map((s, i) => <Spec key={i} icon={s.icon} value={s.value} />)}
          </div>
        )}
      </div>
    </article>
  );
}

function Spec({ icon, value }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, font: 'var(--weight-regular) var(--size-xs) var(--font-sans)', color: 'var(--text-muted)' }}>
      <Icon name={icon} size={14} style={{ color: 'var(--text-faint)' }} />{value}
    </span>
  );
}
