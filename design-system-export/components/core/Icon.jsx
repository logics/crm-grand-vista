import React from 'react';

const BASE = 'https://unpkg.com/lucide-static@0.428.0/icons/';
const cache = {};

/** Monochrome Lucide glyph. The SVG source is fetched once per name and inlined as real
 *  DOM (not a CSS mask) so it survives snapshots, print and PPTX export. */
export function Icon({ name, size = 18, strokeWidth = 1.5, color, style, title, ...rest }) {
  const [svg, setSvg] = React.useState(cache[name] || null);

  React.useEffect(() => {
    if (cache[name]) { setSvg(cache[name]); return; }
    let live = true;
    fetch(BASE + name + '.svg')
      .then((r) => (r.ok ? r.text() : ''))
      .then((t) => {
        const inner = t.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '').trim();
        cache[name] = inner;
        if (live) setSvg(inner);
      })
      .catch(() => {});
    return () => { live = false; };
  }, [name]);

  return (
    <span
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      style={{ display: 'inline-flex', flex: '0 0 auto', width: size, height: size, color: color || 'currentColor', ...style }}
      {...rest}
    >
      <svg
        width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        dangerouslySetInnerHTML={{ __html: svg || '' }}
      />
    </span>
  );
}
