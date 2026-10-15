import React from 'react';

/** Type-only lockup. No vector brand mark was supplied with the source material
 *  (only a photograph of the signage), so the wordmark is set in type. */
export function Wordmark({ size = 20, tone = 'dark', descriptor = true, style, ...rest }) {
  const fg = tone === 'light' ? 'var(--gv-sand-100)' : 'var(--gv-green-800)';
  const rule = tone === 'light' ? 'rgba(243,231,206,.45)' : 'var(--gv-gold-500)';
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: fg, ...style }} {...rest}>
      <span className="gv-wordmark" style={{ fontSize: size, fontWeight: 'var(--weight-light)', lineHeight: 1 }}>
        Grand Vista
      </span>
      {descriptor && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
          <span style={{ flex: 1, height: 1, background: rule }} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: Math.max(8, size * 0.42), letterSpacing: 'var(--tracking-eyebrow)', textTransform: 'uppercase', color: tone === 'light' ? 'var(--gv-gold-300)' : 'var(--gv-gold-700)' }}>
            Fazendas
          </span>
          <span style={{ flex: 1, height: 1, background: rule }} />
        </span>
      )}
    </span>
  );
}
