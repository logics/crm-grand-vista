import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function StageStepper({ stages = [], current = 0, onSelect, compact = false, style, ...rest }) {
  if (compact) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', ...style }} {...rest}>
        <ol style={{ listStyle: 'none', display: 'flex', margin: 0, padding: 0, gap: 2 }}>
          {stages.map((s, i) => {
            const done = i < current, on = i === current;
            return (
              <li key={i} title={typeof s === 'string' ? s : undefined} onClick={() => onSelect && onSelect(i)}
                style={{ flex: '1 1 0', minWidth: 0, height: 4, borderRadius: 'var(--radius-pill)', cursor: onSelect ? 'pointer' : 'default',
                  background: done ? 'var(--gv-green-500)' : on ? 'var(--brand-accent)' : 'var(--gv-ink-100)' }} />
            );
          })}
        </ol>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-5)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, font: 'var(--weight-medium) var(--size-sm) var(--font-sans)', color: 'var(--text-heading)' }}>
            <Icon name="chevron-right" size={13} style={{ color: 'var(--brand-accent)' }} />{stages[current]}
          </span>
          <span className="gv-num" style={{ fontSize: 'var(--size-micro)', color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>
            etapa {current + 1} de {stages.length}
          </span>
        </div>
      </div>
    );
  }
  return (
    <ol style={{ listStyle: 'none', display: 'flex', margin: 0, padding: 0, gap: 2, overflowX: 'auto', ...style }} {...rest}>
      {stages.map((s, i) => {
        const done = i < current, on = i === current;
        return (
          <li key={i} style={{ flex: '1 1 0', minWidth: 96 }}>
            <button onClick={() => onSelect && onSelect(i)} style={{
              display: 'flex', flexDirection: 'column', gap: 6, width: '100%', padding: 0,
              background: 'none', border: 0, cursor: onSelect ? 'pointer' : 'default', textAlign: 'left',
            }}>
              <span style={{ height: 4, borderRadius: 'var(--radius-pill)', background: done ? 'var(--gv-green-500)' : on ? 'var(--brand-accent)' : 'var(--gv-ink-100)' }} />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, font: `${on ? 'var(--weight-medium)' : 'var(--weight-regular)'} var(--size-micro)/1.3 var(--font-sans)`, color: on ? 'var(--text-heading)' : done ? 'var(--text-muted)' : 'var(--text-faint)' }}>
                {done && <Icon name="check" size={11} />}{s}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
