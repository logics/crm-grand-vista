import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function DataTable({ columns = [], rows = [], dense = false, onRowClick, selected = [], empty = 'Nenhum registro encontrado.', style, ...rest }) {
  const [hover, setHover] = React.useState(-1);
  const h = dense ? 'var(--row-height-dense)' : 'var(--row-height)';
  const edge = (i, n) => (i === 0 ? { paddingLeft: 'var(--gutter-card)' } : i === n - 1 ? { paddingRight: 'var(--gutter-card)' } : null);
  return (
    <div style={{ overflowX: 'auto', ...style }} {...rest}>
      <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--weight-regular) var(--size-sm) var(--font-sans)' }}>
        <thead>
          <tr>
            {columns.map((c, ci) => (
              <th key={c.key} style={{
                textAlign: c.align || 'left', padding: '0 12px', height: 40,
                background: 'var(--surface-sunken)', color: 'var(--text-faint)',
                font: 'var(--weight-regular) var(--size-xs)/1 var(--font-sans)',
                border: 0, whiteSpace: 'nowrap', width: c.width, ...edge(ci, columns.length),
              }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {c.label}{c.sorted && <Icon name={c.sorted === 'desc' ? 'arrow-down' : 'arrow-up'} size={12} />}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={columns.length} style={{ padding: 'var(--space-10)', textAlign: 'center', color: 'var(--text-faint)' }}>{empty}</td></tr>
          )}
          {rows.map((r, i) => {
            const sel = selected.includes(r.id);
            return (
              <tr key={r.id || i}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(-1)}
                onClick={() => onRowClick && onRowClick(r, i)}
                style={{
                  height: h, background: sel ? 'var(--surface-selected)' : hover === i ? 'var(--surface-hover)' : 'transparent',
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background-color var(--dur-fast) var(--ease-standard)',
                }}>
                {columns.map((c, ci) => (
                  <td key={c.key} style={{
                    padding: '0 12px', textAlign: c.align || 'left',
                    borderBottom: '1px solid var(--border-subtle)',
                    color: c.muted ? 'var(--text-muted)' : 'var(--text-body)',
                    fontWeight: c.strong ? 'var(--weight-medium)' : undefined,
                    fontFamily: c.mono ? 'var(--font-mono)' : undefined,
                    fontSize: c.mono ? 12.5 : undefined,
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: c.wrap ? 'normal' : 'nowrap', ...edge(ci, columns.length),
                  }}>
                    {c.render ? c.render(r) : r[c.key]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
