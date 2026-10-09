/* @ds-bundle: {"format":4,"namespace":"GrandVistaDesignSystem_6745fe","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"Wordmark","sourcePath":"components/core/Wordmark.jsx"},{"name":"ActivityTimeline","sourcePath":"components/data/ActivityTimeline.jsx"},{"name":"ChecklistItem","sourcePath":"components/data/ChecklistItem.jsx"},{"name":"DataTable","sourcePath":"components/data/DataTable.jsx"},{"name":"DealCard","sourcePath":"components/data/DealCard.jsx"},{"name":"FarmCard","sourcePath":"components/data/FarmCard.jsx"},{"name":"MatchScore","sourcePath":"components/data/MatchScore.jsx"},{"name":"PipelineColumn","sourcePath":"components/data/PipelineColumn.jsx"},{"name":"ProgressBar","sourcePath":"components/data/ProgressBar.jsx"},{"name":"SpecList","sourcePath":"components/data/SpecList.jsx"},{"name":"StatCard","sourcePath":"components/data/StatCard.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"EmptyState","sourcePath":"components/feedback/EmptyState.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Field","sourcePath":"components/forms/Field.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"SearchBar","sourcePath":"components/forms/SearchBar.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"SidebarNav","sourcePath":"components/navigation/SidebarNav.jsx"},{"name":"StageStepper","sourcePath":"components/navigation/StageStepper.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"},{"name":"TopBar","sourcePath":"components/navigation/TopBar.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"bf5949fa3e46","components/core/Button.jsx":"5e587811647e","components/core/Card.jsx":"c0103da87836","components/core/Icon.jsx":"6468ec3a464b","components/core/IconButton.jsx":"6ec3838a765a","components/core/Tag.jsx":"49278bbe974e","components/core/Wordmark.jsx":"a9898bf5ec0d","components/data/ActivityTimeline.jsx":"5866a4a1d160","components/data/ChecklistItem.jsx":"e957ab05b31f","components/data/DataTable.jsx":"b7914598d058","components/data/DealCard.jsx":"76fbfcdb1d67","components/data/FarmCard.jsx":"c7d4fbc80827","components/data/MatchScore.jsx":"6f468ab4e73c","components/data/PipelineColumn.jsx":"2352bfa05a6a","components/data/ProgressBar.jsx":"f2329ba55d38","components/data/SpecList.jsx":"1635f00702a5","components/data/StatCard.jsx":"8eb5ed3aa3dc","components/feedback/Dialog.jsx":"1ca42650ed35","components/feedback/EmptyState.jsx":"b5aa21fddf42","components/feedback/Toast.jsx":"211ab6535d73","components/forms/Checkbox.jsx":"86a204914cc3","components/forms/Field.jsx":"5653ea06e97c","components/forms/Input.jsx":"d2efe4f7cbdd","components/forms/SearchBar.jsx":"ec9c843e63ab","components/forms/Select.jsx":"9305cf1846a1","components/forms/Switch.jsx":"92bc1429c7e0","components/forms/Textarea.jsx":"8f05489d05b3","components/navigation/SidebarNav.jsx":"4c30f0d3a64e","components/navigation/StageStepper.jsx":"8d8101343b06","components/navigation/Tabs.jsx":"8af1b4f619a0","components/navigation/TopBar.jsx":"705a40b5c3c4","ui_kits/crm-v2/Dashboard.jsx":"760d9d828842","ui_kits/crm-v2/Drawers.jsx":"95d9e586876d","ui_kits/crm-v2/Fazendas.jsx":"2c0d602865d5","ui_kits/crm-v2/Pipeline.jsx":"d7216ad68ae0","ui_kits/crm-v2/Shell.jsx":"10b6860ad4a3","ui_kits/crm-v2/tweaks-panel.jsx":"d259e3a86f73","ui_kits/crm-v2/ui.jsx":"7f4a93903e87","ui_kits/data.js":"90313563b3a3","ui_kits/site/HomeScreen.jsx":"c1a16ba5ba0a","ui_kits/site/ListingScreen.jsx":"856dc0e64d18","ui_kits/site/PropertyScreen.jsx":"1dc060abfcc6","ui_kits/site/SiteChrome.jsx":"b4d645dc82b4"},"inlinedExternals":[],"unexposedExports":[{"name":"fieldSurface","sourcePath":"components/forms/Input.jsx"}]} */

(() => {

const __ds_ns = (window.GrandVistaDesignSystem_6745fe = window.GrandVistaDesignSystem_6745fe || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONES = {
  default: {
    bg: 'var(--surface-card)',
    fg: 'var(--text-body)',
    shadow: 'var(--shadow-sm)',
    hover: 'var(--shadow-md)',
    sub: 'var(--text-faint)'
  },
  hero: {
    bg: 'var(--gradient-hero)',
    fg: '#fff',
    shadow: 'var(--shadow-hero)',
    hover: 'var(--shadow-hero)',
    sub: 'rgba(255,255,255,.72)'
  },
  inverse: {
    bg: 'var(--surface-inverse)',
    fg: '#fff',
    shadow: 'none',
    hover: 'none',
    sub: 'rgba(255,255,255,.66)'
  },
  sunken: {
    bg: 'var(--surface-muted)',
    fg: 'var(--text-body)',
    shadow: 'none',
    hover: 'none',
    sub: 'var(--text-faint)'
  }
};
function Card({
  children,
  title,
  subtitle,
  eyebrow,
  action,
  padding = 'var(--gutter-card)',
  tone = 'default',
  accent = false,
  interactive = false,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const t = TONES[tone] || TONES.default;
  const ring = accent ? 'inset 0 0 0 1.5px rgba(196,154,78,.55), ' : '';
  return /*#__PURE__*/React.createElement("section", _extends({
    onMouseEnter: () => interactive && setHover(true),
    onMouseLeave: () => interactive && setHover(false),
    style: {
      background: t.bg,
      color: t.fg,
      border: 0,
      borderRadius: 'var(--radius-card)',
      boxShadow: ring + (hover ? t.hover : t.shadow),
      transform: hover ? 'translateY(-1px)' : 'none',
      transition: 'box-shadow var(--dur-normal) var(--ease-standard), transform var(--dur-normal) var(--ease-standard)',
      overflow: 'hidden',
      minWidth: 0,
      cursor: interactive ? 'pointer' : undefined,
      ...style
    }
  }, rest), (title || action || eyebrow) && /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-5)',
      flexWrap: 'wrap',
      padding: '18px ' + padding + ' 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, eyebrow && /*#__PURE__*/React.createElement("div", {
    className: "gv-eyebrow",
    style: {
      marginBottom: 4,
      color: t.sub
    }
  }, eyebrow), title && /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 16,
      fontWeight: 'var(--weight-semibold)',
      letterSpacing: 'var(--tracking-tight)',
      color: 'inherit'
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '3px 0 0',
      fontSize: 12.5,
      color: t.sub
    }
  }, subtitle)), action), /*#__PURE__*/React.createElement("div", {
    style: {
      padding
    }
  }, children));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const BASE = 'https://unpkg.com/lucide-static@0.428.0/icons/';
const cache = {};

/** Monochrome Lucide glyph. The SVG source is fetched once per name and inlined as real
 *  DOM (not a CSS mask) so it survives snapshots, print and PPTX export. */
function Icon({
  name,
  size = 18,
  strokeWidth = 1.5,
  color,
  style,
  title,
  ...rest
}) {
  const [svg, setSvg] = React.useState(cache[name] || null);
  React.useEffect(() => {
    if (cache[name]) {
      setSvg(cache[name]);
      return;
    }
    let live = true;
    fetch(BASE + name + '.svg').then(r => r.ok ? r.text() : '').then(t => {
      const inner = t.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '').trim();
      cache[name] = inner;
      if (live) setSvg(inner);
    }).catch(() => {});
    return () => {
      live = false;
    };
  }, [name]);
  return /*#__PURE__*/React.createElement("span", _extends({
    role: title ? 'img' : 'presentation',
    "aria-label": title,
    style: {
      display: 'inline-flex',
      flex: '0 0 auto',
      width: size,
      height: size,
      color: color || 'currentColor',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    dangerouslySetInnerHTML: {
      __html: svg || ''
    }
  }));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONES = {
  neutral: ['var(--surface-muted)', 'var(--text-muted)'],
  success: ['var(--status-success-bg)', 'var(--status-success-fg)'],
  warning: ['var(--status-warning-bg)', 'var(--status-warning-fg)'],
  danger: ['var(--status-danger-bg)', 'var(--status-danger-fg)'],
  info: ['var(--status-info-bg)', 'var(--status-info-fg)'],
  brand: ['var(--brand-primary-soft)', 'var(--brand-primary)'],
  gold: ['var(--brand-accent-soft)', 'var(--brand-accent-ink)']
};
function Badge({
  children,
  tone = 'neutral',
  icon,
  dot = false,
  size = 'md',
  style,
  ...rest
}) {
  const [bg, fg] = TONES[tone] || TONES.neutral;
  const sm = size === 'sm';
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: sm ? 20 : 24,
      padding: sm ? '0 7px' : '0 10px',
      background: bg,
      color: fg,
      border: 0,
      borderRadius: 'var(--radius-pill)',
      font: (sm ? 'var(--weight-semibold) 11px' : 'var(--weight-medium) 12px') + '/1 var(--font-sans)',
      fontVariantNumeric: 'tabular-nums',
      whiteSpace: 'nowrap',
      ...style
    }
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: 'currentColor'
    }
  }), icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 12
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    height: 'var(--control-height-sm)',
    padding: '0 12px',
    font: '12.5px',
    icon: 14
  },
  md: {
    height: 'var(--control-height)',
    padding: '0 16px',
    font: '13.5px',
    icon: 16
  },
  lg: {
    height: 'var(--control-height-lg)',
    padding: '0 22px',
    font: 'var(--size-body)',
    icon: 18
  }
};
const VARIANTS = {
  primary: {
    bg: 'var(--brand-primary)',
    hover: 'var(--brand-primary-hover)',
    fg: 'var(--brand-on-primary)',
    shadow: 'var(--shadow-primary)'
  },
  accent: {
    bg: 'var(--brand-accent)',
    hover: 'var(--brand-accent-hover)',
    fg: 'var(--brand-on-accent)',
    shadow: '0 8px 18px -8px rgba(166,124,58,.6)'
  },
  secondary: {
    bg: 'var(--surface-card)',
    hover: 'var(--surface-sunken)',
    fg: 'var(--text-body)',
    shadow: 'var(--shadow-xs)'
  },
  soft: {
    bg: 'var(--surface-sunken)',
    hover: 'var(--surface-muted)',
    fg: 'var(--text-body)',
    shadow: 'none'
  },
  dark: {
    bg: 'var(--surface-inverse)',
    hover: '#000',
    fg: 'var(--text-on-inverse)',
    shadow: 'none'
  },
  ghost: {
    bg: 'transparent',
    hover: 'var(--surface-sunken)',
    fg: 'var(--text-muted)',
    hoverFg: 'var(--text-body)',
    shadow: 'none'
  },
  danger: {
    bg: 'var(--status-danger-bg)',
    hover: '#F3D4CE',
    fg: 'var(--status-danger-fg)',
    shadow: 'none'
  }
};
function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  count,
  block,
  disabled,
  style,
  ...rest
}) {
  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.primary;
  const [hover, setHover] = React.useState(false);
  const [down, setDown] = React.useState(false);
  const light = variant === 'primary' || variant === 'dark';
  return /*#__PURE__*/React.createElement("button", _extends({
    disabled: disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setDown(false);
    },
    onMouseDown: () => setDown(true),
    onMouseUp: () => setDown(false),
    style: {
      display: block ? 'flex' : 'inline-flex',
      width: block ? '100%' : undefined,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--space-4)',
      height: s.height,
      padding: s.padding,
      border: 0,
      font: 'var(--weight-medium) ' + s.font + '/1 var(--font-sans)',
      background: hover && !disabled ? v.hover : v.bg,
      color: hover && v.hoverFg && !disabled ? v.hoverFg : v.fg,
      borderRadius: 'var(--radius-control)',
      boxShadow: v.shadow,
      whiteSpace: 'nowrap',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      transform: down && !disabled ? 'translateY(1px)' : 'none',
      transition: 'var(--transition-control), transform var(--dur-instant) var(--ease-standard)',
      ...style
    }
  }, rest), icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: s.icon
  }), children, count != null && /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 18,
      height: 18,
      padding: '0 5px',
      borderRadius: 9,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 10.5,
      fontVariantNumeric: 'tabular-nums',
      background: light ? '#fff' : 'var(--brand-primary)',
      color: light ? 'var(--brand-primary)' : '#fff'
    }
  }, count), iconRight && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconRight,
    size: s.icon
  }));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function IconButton({
  icon,
  label,
  size = 'md',
  variant = 'ghost',
  dot = false,
  disabled,
  style,
  ...rest
}) {
  const box = size === 'sm' ? 32 : size === 'lg' ? 48 : 40;
  const glyph = size === 'sm' ? 15 : size === 'lg' ? 20 : 17;
  const [hover, setHover] = React.useState(false);
  const V = {
    ghost: ['transparent', 'var(--surface-sunken)', 'var(--text-muted)', 'none'],
    outline: ['var(--surface-card)', 'var(--surface-sunken)', 'var(--text-muted)', 'inset 0 0 0 1px var(--border-subtle)'],
    soft: ['var(--surface-sunken)', 'var(--surface-muted)', 'var(--text-body)', 'none'],
    solid: ['var(--brand-primary)', 'var(--brand-primary-hover)', 'var(--brand-on-primary)', 'var(--shadow-primary)']
  };
  const [bg, hbg, fg, sh] = V[variant] || V.ghost;
  return /*#__PURE__*/React.createElement("button", _extends({
    "aria-label": label,
    title: label,
    disabled: disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: '0 0 auto',
      width: box,
      height: box,
      padding: 0,
      border: 0,
      borderRadius: '50%',
      background: hover && !disabled ? hbg : bg,
      color: hover && variant !== 'solid' ? 'var(--text-body)' : fg,
      boxShadow: sh,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      transition: 'var(--transition-control)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: glyph
  }), dot && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: box * 0.22,
      right: box * 0.24,
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: 'var(--status-danger-fg)',
      boxShadow: '0 0 0 2px #fff'
    }
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Tag({
  children,
  onRemove,
  icon,
  selected = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      height: 26,
      padding: onRemove ? '0 6px 0 10px' : '0 10px',
      background: selected ? 'var(--brand-primary-soft)' : 'var(--surface-sunken)',
      color: selected ? 'var(--brand-primary)' : 'var(--text-muted)',
      border: 0,
      borderRadius: 8,
      font: (selected ? 'var(--weight-medium)' : 'var(--weight-regular)') + ' 12px/1 var(--font-sans)',
      whiteSpace: 'nowrap',
      ...style
    }
  }, rest), icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 13
  }), children, onRemove && /*#__PURE__*/React.createElement("button", {
    onClick: onRemove,
    "aria-label": "Remover",
    style: {
      display: 'inline-flex',
      padding: 2,
      marginLeft: 2,
      background: 'none',
      border: 0,
      borderRadius: '50%',
      color: 'inherit',
      opacity: 0.7,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 12
  })));
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/core/Wordmark.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Type-only lockup. No vector brand mark was supplied with the source material
 *  (only a photograph of the signage), so the wordmark is set in type. */
function Wordmark({
  size = 20,
  tone = 'dark',
  descriptor = true,
  style,
  ...rest
}) {
  const fg = tone === 'light' ? 'var(--gv-sand-100)' : 'var(--gv-green-800)';
  const rule = tone === 'light' ? 'rgba(243,231,206,.45)' : 'var(--gv-gold-500)';
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      color: fg,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: "gv-wordmark",
    style: {
      fontSize: size,
      fontWeight: 'var(--weight-light)',
      lineHeight: 1
    }
  }, "Grand Vista"), descriptor && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 1,
      background: rule
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: Math.max(8, size * 0.42),
      letterSpacing: 'var(--tracking-eyebrow)',
      textTransform: 'uppercase',
      color: tone === 'light' ? 'var(--gv-gold-300)' : 'var(--gv-gold-700)'
    }
  }, "Fazendas"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 1,
      background: rule
    }
  })));
}
Object.assign(__ds_scope, { Wordmark });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Wordmark.jsx", error: String((e && e.message) || e) }); }

// components/data/ActivityTimeline.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const KIND = {
  visita: 'map-pin',
  reuniao: 'users',
  ligacao: 'phone',
  mensagem: 'message-circle',
  email: 'mail',
  nota: 'sticky-note',
  sistema: 'refresh-cw'
};
function ActivityTimeline({
  items = [],
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("ol", _extends({
    style: {
      listStyle: 'none',
      margin: 0,
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      ...style
    }
  }, rest), items.map((it, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    style: {
      display: 'flex',
      gap: 'var(--space-5)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'grid',
      placeItems: 'center',
      width: 26,
      height: 26,
      borderRadius: '50%',
      background: 'var(--gv-green-50)',
      color: 'var(--gv-green-600)',
      border: '1px solid var(--gv-green-100)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: KIND[it.kind] || 'circle',
    size: 13
  })), i < items.length - 1 && /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      width: 1,
      background: 'var(--border-default)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      paddingBottom: i < items.length - 1 ? 'var(--space-7)' : 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 'var(--space-5)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--weight-medium) var(--size-sm)/1.35 var(--font-sans)',
      color: 'var(--text-body)'
    }
  }, it.title), /*#__PURE__*/React.createElement("span", {
    className: "gv-num",
    style: {
      fontSize: 'var(--size-micro)',
      color: 'var(--text-faint)'
    }
  }, it.date)), it.detail && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '2px 0 0',
      font: 'var(--weight-regular) var(--size-xs)/1.5 var(--font-sans)',
      color: 'var(--text-muted)'
    }
  }, it.detail), it.author && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--weight-regular) var(--size-micro) var(--font-sans)',
      color: 'var(--text-faint)'
    }
  }, it.author)))));
}
Object.assign(__ds_scope, { ActivityTimeline });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/ActivityTimeline.jsx", error: String((e && e.message) || e) }); }

// components/data/ChecklistItem.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const STATE = {
  ok: ['check', 'var(--status-success-fg)', 'var(--status-success-bg)'],
  pending: ['clock', 'var(--status-warning-fg)', 'var(--status-warning-bg)'],
  blocked: ['alert-triangle', 'var(--status-danger-fg)', 'var(--status-danger-bg)'],
  empty: ['minus', 'var(--text-faint)', 'var(--gv-ink-50)']
};
function ChecklistItem({
  label,
  meta,
  state = 'empty',
  badge,
  action,
  style,
  ...rest
}) {
  const [icon, fg, bg] = STATE[state] || STATE.empty;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-5)',
      padding: 'var(--space-5) 0',
      borderBottom: '1px solid var(--border-subtle)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'grid',
      placeItems: 'center',
      width: 24,
      height: 24,
      flex: '0 0 auto',
      background: bg,
      color: fg,
      borderRadius: 'var(--radius-sm)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 14
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: 'var(--weight-medium) var(--size-sm)/1.3 var(--font-sans)',
      color: 'var(--text-body)'
    }
  }, label), meta && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: 'var(--weight-regular) var(--size-xs)/1.4 var(--font-sans)',
      color: 'var(--text-faint)'
    }
  }, meta)), badge && (typeof badge === 'string' ? /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: state === 'ok' ? 'success' : state === 'blocked' ? 'danger' : 'warning'
  }, badge) : badge), action);
}
Object.assign(__ds_scope, { ChecklistItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/ChecklistItem.jsx", error: String((e && e.message) || e) }); }

// components/data/DataTable.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function DataTable({
  columns = [],
  rows = [],
  dense = false,
  onRowClick,
  selected = [],
  empty = 'Nenhum registro encontrado.',
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(-1);
  const h = dense ? 'var(--row-height-dense)' : 'var(--row-height)';
  const edge = (i, n) => i === 0 ? {
    paddingLeft: 'var(--gutter-card)'
  } : i === n - 1 ? {
    paddingRight: 'var(--gutter-card)'
  } : null;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      overflowX: 'auto',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      font: 'var(--weight-regular) var(--size-sm) var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, columns.map((c, ci) => /*#__PURE__*/React.createElement("th", {
    key: c.key,
    style: {
      textAlign: c.align || 'left',
      padding: '0 12px',
      height: 40,
      background: 'var(--surface-sunken)',
      color: 'var(--text-faint)',
      font: 'var(--weight-regular) var(--size-xs)/1 var(--font-sans)',
      border: 0,
      whiteSpace: 'nowrap',
      width: c.width,
      ...edge(ci, columns.length)
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4
    }
  }, c.label, c.sorted && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: c.sorted === 'desc' ? 'arrow-down' : 'arrow-up',
    size: 12
  })))))), /*#__PURE__*/React.createElement("tbody", null, rows.length === 0 && /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: columns.length,
    style: {
      padding: 'var(--space-10)',
      textAlign: 'center',
      color: 'var(--text-faint)'
    }
  }, empty)), rows.map((r, i) => {
    const sel = selected.includes(r.id);
    return /*#__PURE__*/React.createElement("tr", {
      key: r.id || i,
      onMouseEnter: () => setHover(i),
      onMouseLeave: () => setHover(-1),
      onClick: () => onRowClick && onRowClick(r, i),
      style: {
        height: h,
        background: sel ? 'var(--surface-selected)' : hover === i ? 'var(--surface-hover)' : 'transparent',
        cursor: onRowClick ? 'pointer' : 'default',
        transition: 'background-color var(--dur-fast) var(--ease-standard)'
      }
    }, columns.map((c, ci) => /*#__PURE__*/React.createElement("td", {
      key: c.key,
      style: {
        padding: '0 12px',
        textAlign: c.align || 'left',
        borderBottom: '1px solid var(--border-subtle)',
        color: c.muted ? 'var(--text-muted)' : 'var(--text-body)',
        fontWeight: c.strong ? 'var(--weight-medium)' : undefined,
        fontFamily: c.mono ? 'var(--font-mono)' : undefined,
        fontSize: c.mono ? 12.5 : undefined,
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: c.wrap ? 'normal' : 'nowrap',
        ...edge(ci, columns.length)
      }
    }, c.render ? c.render(r) : r[c.key])));
  }))));
}
Object.assign(__ds_scope, { DataTable });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/DataTable.jsx", error: String((e && e.message) || e) }); }

// components/data/DealCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function DealCard({
  client,
  farm,
  value,
  probability,
  owner,
  nextAction,
  overdue,
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const initials = typeof owner === 'string' ? owner.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() : null;
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      padding: 14,
      background: 'var(--surface-card)',
      border: 0,
      borderRadius: 'var(--radius-md)',
      boxShadow: hover ? 'var(--shadow-md)' : 'var(--shadow-sm)',
      transform: hover ? 'translateY(-1px)' : 'none',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'box-shadow var(--dur-normal) var(--ease-standard), transform var(--dur-normal) var(--ease-standard)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--weight-semibold) 13.5px/1.3 var(--font-sans)',
      color: 'var(--text-heading)'
    }
  }, client), farm && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      marginTop: 2,
      fontSize: 12,
      color: 'var(--text-faint)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "tractor",
    size: 13
  }), farm)), (value || typeof probability === 'number') && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 8
    }
  }, value && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      fontWeight: 'var(--weight-semibold)',
      letterSpacing: '-.02em',
      fontVariantNumeric: 'tabular-nums'
    }
  }, value), typeof probability === 'number' && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--text-muted)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, probability, "%")), typeof probability === 'number' && /*#__PURE__*/React.createElement("div", {
    style: {
      height: 4,
      borderRadius: 2,
      background: 'var(--surface-sunken)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: probability + '%',
      height: '100%',
      borderRadius: 2,
      background: 'var(--brand-accent)'
    }
  })), (nextAction || owner) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      paddingTop: 10,
      borderTop: '1px solid var(--border-subtle)',
      fontSize: 12,
      color: overdue ? 'var(--status-danger-fg)' : 'var(--text-muted)'
    }
  }, nextAction && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: overdue ? 'alert-circle' : 'calendar-clock',
    size: 13
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, nextAction)), initials && /*#__PURE__*/React.createElement("span", {
    title: owner,
    style: {
      marginLeft: 'auto',
      width: 26,
      height: 26,
      borderRadius: '50%',
      display: 'grid',
      placeItems: 'center',
      background: 'var(--brand-primary-soft)',
      color: 'var(--brand-primary)',
      fontSize: 10,
      fontWeight: 'var(--weight-semibold)'
    }
  }, initials)));
}
Object.assign(__ds_scope, { DealCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/DealCard.jsx", error: String((e && e.message) || e) }); }

// components/data/FarmCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function FarmCard({
  name,
  location,
  price,
  priceUnit = 'por hectare',
  area,
  specs = [],
  status,
  statusTone = 'success',
  image,
  featured,
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("article", _extends({
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--surface-card)',
      border: 0,
      padding: 8,
      borderRadius: 'var(--radius-card)',
      boxShadow: (featured ? 'inset 0 0 0 1.5px rgba(196,154,78,.55), ' : '') + (hover ? 'var(--shadow-md)' : 'var(--shadow-sm)'),
      transform: hover ? 'translateY(-1px)' : 'none',
      transition: 'box-shadow var(--dur-normal) var(--ease-standard), transform var(--dur-normal) var(--ease-standard)',
      cursor: onClick ? 'pointer' : 'default',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: 168,
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      background: image ? 'center/cover no-repeat url(' + image + ')' : 'var(--surface-muted)',
      display: 'grid',
      placeItems: 'center'
    }
  }, !image && /*#__PURE__*/React.createElement("span", {
    className: "gv-eyebrow"
  }, "Foto da propriedade"), status && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 10,
      left: 10
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: statusTone,
    dot: true,
    style: {
      background: '#fff',
      boxShadow: 'var(--shadow-xs)'
    }
  }, status)), featured && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 10,
      right: 10
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: "gold"
  }, "Destaque"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)',
      padding: '12px 10px 8px'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 16,
      fontWeight: 'var(--weight-semibold)',
      letterSpacing: 'var(--tracking-tight)'
    }
  }, name), location && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
      font: 'var(--weight-regular) 12.5px var(--font-sans)',
      color: 'var(--text-faint)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "map-pin",
    size: 13
  }), location)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 6,
      paddingTop: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "gv-num",
    style: {
      fontSize: 18,
      color: 'var(--text-heading)',
      fontWeight: 'var(--weight-semibold)',
      letterSpacing: '-.02em'
    }
  }, price), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--weight-regular) var(--size-xs) var(--font-sans)',
      color: 'var(--text-faint)'
    }
  }, priceUnit)), (area || specs.length > 0) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 'var(--space-5)',
      paddingTop: 'var(--space-4)',
      borderTop: '1px solid var(--border-subtle)'
    }
  }, area && /*#__PURE__*/React.createElement(Spec, {
    icon: "ruler",
    value: area
  }), specs.map((s, i) => /*#__PURE__*/React.createElement(Spec, {
    key: i,
    icon: s.icon,
    value: s.value
  })))));
}
function Spec({
  icon,
  value
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      font: 'var(--weight-regular) var(--size-xs) var(--font-sans)',
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 14,
    style: {
      color: 'var(--text-faint)'
    }
  }), value);
}
Object.assign(__ds_scope, { FarmCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/FarmCard.jsx", error: String((e && e.message) || e) }); }

// components/data/MatchScore.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function MatchScore({
  value = 0,
  size = 'md',
  showLabel = true,
  style,
  ...rest
}) {
  const pct = Math.max(0, Math.min(100, value));
  const tone = pct >= 80 ? 'var(--gv-success-600)' : pct >= 55 ? 'var(--gv-gold-600)' : 'var(--gv-ink-400)';
  const label = pct >= 80 ? 'Alta compatibilidade' : pct >= 55 ? 'Compatibilidade média' : 'Compatibilidade baixa';
  const dim = size === 'sm' ? 34 : size === 'lg' ? 60 : 44;
  const stroke = size === 'sm' ? 3 : size === 'lg' ? 5 : 4;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-5)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      width: dim,
      height: dim,
      borderRadius: '50%',
      display: 'grid',
      placeItems: 'center',
      background: `conic-gradient(${tone} ${pct}%, var(--gv-ink-100) 0)`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: dim - stroke * 2,
      height: dim - stroke * 2,
      borderRadius: '50%',
      background: 'var(--surface-card)',
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "gv-num",
    style: {
      fontSize: size === 'sm' ? 11 : size === 'lg' ? 17 : 13,
      fontWeight: 'var(--weight-medium)',
      color: tone
    }
  }, pct))), showLabel && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--weight-medium) var(--size-sm)/1.2 var(--font-sans)',
      color: 'var(--text-body)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--weight-regular) var(--size-xs)/1.3 var(--font-sans)',
      color: 'var(--text-faint)'
    }
  }, "Matching por regi\xE3o, \xE1rea e ticket")));
}
Object.assign(__ds_scope, { MatchScore });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/MatchScore.jsx", error: String((e && e.message) || e) }); }

// components/data/PipelineColumn.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function PipelineColumn({
  stage,
  index = 1,
  count,
  total,
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      flex: '0 0 296px',
      minWidth: 0,
      padding: 8,
      background: 'var(--surface-muted)',
      borderRadius: 'var(--radius-lg)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 8px 6px',
      font: 'var(--weight-semibold) 13px/1.2 var(--font-sans)',
      color: 'var(--text-heading)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: 'var(--stage-' + index + ')',
      flex: '0 0 auto'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, stage), typeof count === 'number' && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 'var(--weight-medium)',
      color: 'var(--text-faint)',
      background: 'var(--surface-card)',
      borderRadius: 9,
      padding: '1px 7px',
      fontVariantNumeric: 'tabular-nums'
    }
  }, count), total && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      fontSize: 12,
      fontWeight: 'var(--weight-medium)',
      color: 'var(--text-muted)',
      fontVariantNumeric: 'tabular-nums',
      whiteSpace: 'nowrap'
    }
  }, total)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      minHeight: 96
    }
  }, children));
}
Object.assign(__ds_scope, { PipelineColumn });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/PipelineColumn.jsx", error: String((e && e.message) || e) }); }

// components/data/ProgressBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function ProgressBar({
  value = 0,
  label,
  valueLabel,
  tone = 'brand',
  height = 6,
  style,
  ...rest
}) {
  const pct = Math.max(0, Math.min(100, value));
  const fill = tone === 'gold' ? 'var(--brand-accent)' : tone === 'success' ? 'var(--gv-success-600)' : tone === 'danger' ? 'var(--gv-danger-600)' : 'var(--brand-primary)';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      ...style
    }
  }, rest), (label || valueLabel) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 'var(--space-5)'
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--weight-regular) var(--size-xs) var(--font-sans)',
      color: 'var(--text-muted)'
    }
  }, label), valueLabel && /*#__PURE__*/React.createElement("span", {
    className: "gv-num",
    style: {
      fontSize: 'var(--size-xs)',
      color: 'var(--text-body)'
    }
  }, valueLabel)), /*#__PURE__*/React.createElement("div", {
    style: {
      height,
      background: 'var(--gv-ink-100)',
      borderRadius: 'var(--radius-pill)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: pct + '%',
      height: '100%',
      background: fill,
      borderRadius: 'var(--radius-pill)',
      transition: 'width var(--dur-slow) var(--ease-out)'
    }
  })));
}
Object.assign(__ds_scope, { ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/ProgressBar.jsx", error: String((e && e.message) || e) }); }

// components/data/SpecList.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function SpecList({
  items = [],
  columns = 2,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("dl", _extends({
    style: {
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))`,
      gap: 'var(--space-5) var(--space-9)',
      margin: 0,
      ...style
    }
  }, rest), items.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      paddingBottom: 'var(--space-4)',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("dt", {
    className: "gv-eyebrow"
  }, it.label), /*#__PURE__*/React.createElement("dd", {
    style: {
      margin: 0,
      font: `var(--weight-medium) var(--size-sm) ${it.mono ? 'var(--font-mono)' : 'var(--font-sans)'}`,
      color: 'var(--text-body)'
    }
  }, it.value || '—'))));
}
Object.assign(__ds_scope, { SpecList });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/SpecList.jsx", error: String((e && e.message) || e) }); }

// components/data/StatCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONES = {
  default: {
    bg: 'var(--surface-card)',
    fg: 'var(--text-heading)',
    sub: 'var(--text-muted)',
    faint: 'var(--text-faint)',
    shadow: 'var(--shadow-sm)',
    chip: 'var(--surface-sunken)'
  },
  hero: {
    bg: 'var(--gradient-hero)',
    fg: '#fff',
    sub: 'rgba(255,255,255,.72)',
    faint: 'rgba(255,255,255,.6)',
    shadow: 'var(--shadow-hero)',
    chip: 'rgba(255,255,255,.14)'
  },
  dark: {
    bg: 'var(--surface-inverse)',
    fg: '#fff',
    sub: 'rgba(255,255,255,.72)',
    faint: 'rgba(255,255,255,.6)',
    shadow: 'var(--shadow-hero)',
    chip: 'rgba(255,255,255,.12)'
  },
  gold: {
    bg: 'var(--gradient-gold)',
    fg: 'var(--gv-green-900)',
    sub: 'rgba(18,36,27,.72)',
    faint: 'rgba(18,36,27,.6)',
    shadow: '0 18px 40px -18px rgba(166,124,58,.7)',
    chip: 'rgba(18,36,27,.1)'
  }
};
function StatCard({
  label,
  value,
  unit,
  delta,
  deltaTone = 'success',
  icon,
  footnote,
  rows,
  tone = 'default',
  style,
  ...rest
}) {
  const t = TONES[tone] || TONES.default;
  const filled = tone !== 'default';
  const dBg = filled ? t.chip : deltaTone === 'danger' ? 'var(--status-danger-bg)' : deltaTone === 'neutral' ? 'var(--surface-muted)' : 'var(--status-success-bg)';
  const dFg = filled ? t.fg : deltaTone === 'danger' ? 'var(--status-danger-fg)' : deltaTone === 'neutral' ? 'var(--text-muted)' : 'var(--status-success-fg)';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      minWidth: 0,
      padding: '18px var(--gutter-card)',
      background: t.bg,
      color: t.fg,
      border: 0,
      borderRadius: 'var(--radius-card)',
      boxShadow: t.shadow,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-5)',
      fontSize: 13,
      color: t.sub
    }
  }, /*#__PURE__*/React.createElement("span", null, label), icon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'grid',
      placeItems: 'center',
      width: 32,
      height: 32,
      borderRadius: '50%',
      background: t.chip,
      color: filled ? t.fg : 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'baseline',
      gap: 6,
      whiteSpace: 'nowrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 30,
      fontWeight: 'var(--weight-semibold)',
      lineHeight: 1,
      letterSpacing: 'var(--tracking-display)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, value), unit && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: t.sub
    }
  }, unit)), delta && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 2,
      height: 20,
      padding: '0 7px',
      borderRadius: 'var(--radius-pill)',
      background: dBg,
      color: dFg,
      fontSize: 11,
      fontWeight: 'var(--weight-semibold)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: deltaTone === 'danger' ? 'arrow-down-right' : 'arrow-up-right',
    size: 12
  }), delta)), rows && rows.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      gap: '4px 12px',
      fontSize: 12,
      color: t.faint
    }
  }, rows.map((r, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, /*#__PURE__*/React.createElement("span", null, r.label), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'right',
      color: t.fg,
      fontWeight: 'var(--weight-medium)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, r.value)))), footnote && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: t.faint
    }
  }, footnote));
}
Object.assign(__ds_scope, { StatCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StatCard.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Dialog({
  open = true,
  title,
  eyebrow,
  children,
  footer,
  onClose,
  width = 520,
  sheet = false,
  style,
  ...rest
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: sheet ? 'flex-end' : 'center',
      justifyContent: 'center',
      padding: sheet ? 0 : 'var(--space-8)',
      background: 'var(--scrim-modal)',
      backdropFilter: 'blur(2px)',
      zIndex: 50
    }
  }, /*#__PURE__*/React.createElement("div", _extends({
    role: "dialog",
    "aria-modal": "true",
    style: {
      width: '100%',
      maxWidth: sheet ? 'none' : width,
      maxHeight: sheet ? '92%' : '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface-card)',
      border: 0,
      borderRadius: sheet ? 'var(--radius-sheet) var(--radius-sheet) 0 0' : 'var(--radius-xl)',
      boxShadow: 'var(--shadow-overlay)',
      overflow: 'hidden',
      ...style
    }
  }, rest), sheet && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 40,
      height: 5,
      borderRadius: 3,
      background: 'var(--border-default)',
      margin: '8px auto 0',
      flex: '0 0 auto'
    }
  }), /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 'var(--space-5)',
      padding: sheet ? '12px 16px 10px 20px' : '20px 18px 14px 24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, eyebrow && /*#__PURE__*/React.createElement("div", {
    className: "gv-eyebrow",
    style: {
      marginBottom: 4
    }
  }, eyebrow), title && /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 20,
      fontWeight: 'var(--weight-semibold)',
      letterSpacing: '-.02em'
    }
  }, title)), onClose && /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "x",
    label: "Fechar",
    variant: "soft",
    size: "sm",
    onClick: onClose
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      padding: sheet ? '4px 20px 20px' : '4px 24px 24px'
    }
  }, children), footer && /*#__PURE__*/React.createElement("footer", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 8,
      padding: sheet ? '12px 16px 20px' : '14px 18px',
      borderTop: '1px solid var(--border-subtle)'
    }
  }, footer)));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/EmptyState.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function EmptyState({
  icon = 'inbox',
  title,
  description,
  action,
  compact = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
      padding: compact ? 'var(--space-9) var(--space-8)' : '72px var(--space-8)',
      textAlign: 'center',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'grid',
      placeItems: 'center',
      width: 48,
      height: 48,
      borderRadius: '50%',
      background: 'var(--surface-sunken)',
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 20
  })), title && /*#__PURE__*/React.createElement("h3", {
    style: {
      marginTop: 8,
      fontSize: 17,
      fontWeight: 'var(--weight-semibold)'
    }
  }, title), description && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      maxWidth: 380,
      font: 'var(--weight-regular) 13px/1.55 var(--font-sans)',
      color: 'var(--text-faint)',
      textWrap: 'pretty'
    }
  }, description), action && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6
    }
  }, action));
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONES = {
  success: ['check', 'var(--gv-gold-400)'],
  warning: ['alert-triangle', '#E9C27A'],
  danger: ['alert-octagon', '#F0A196'],
  info: ['info', '#A9CBE2']
};
function Toast({
  tone = 'success',
  title,
  message,
  action,
  onClose,
  style,
  ...rest
}) {
  const [icon, fg] = TONES[tone] || TONES.info;
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "status",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      width: 380,
      maxWidth: '100%',
      padding: '12px 12px 12px 12px',
      background: 'var(--surface-inverse)',
      color: '#fff',
      border: 0,
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-lg)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'grid',
      placeItems: 'center',
      width: 30,
      height: 30,
      borderRadius: '50%',
      background: 'rgba(255,255,255,.12)',
      color: fg,
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--weight-medium) 13px/1.3 var(--font-sans)'
    }
  }, title), message && /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--weight-regular) 12px/1.45 var(--font-sans)',
      color: 'rgba(255,255,255,.66)',
      marginTop: 1
    }
  }, message)), action, onClose && /*#__PURE__*/React.createElement("button", {
    "aria-label": "Fechar",
    onClick: onClose,
    style: {
      display: 'grid',
      placeItems: 'center',
      width: 28,
      height: 28,
      border: 0,
      borderRadius: '50%',
      background: 'transparent',
      color: 'rgba(255,255,255,.7)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 14
  })));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Checkbox({
  label,
  checked,
  onChange,
  disabled,
  description,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", _extends({
    style: {
      display: 'inline-flex',
      alignItems: description ? 'flex-start' : 'center',
      gap: 'var(--space-5)',
      minHeight: 24,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: !!checked,
    onChange: onChange,
    readOnly: !onChange,
    disabled: disabled,
    style: {
      position: 'absolute',
      opacity: 0,
      width: 0,
      height: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 18,
      height: 18,
      flex: '0 0 auto',
      marginTop: description ? 1 : 0,
      background: checked ? 'var(--brand-primary)' : 'var(--surface-card)',
      boxShadow: checked ? 'none' : 'inset 0 0 0 1.5px var(--border-default)',
      borderRadius: 5,
      color: '#fff',
      transition: 'var(--transition-control)'
    }
  }, checked && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 13
  })), (label || description) && /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--weight-regular) 13.5px/1.35 var(--font-sans)',
      color: 'var(--text-body)'
    }
  }, label), description && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: 'var(--weight-regular) var(--size-xs)/1.4 var(--font-sans)',
      color: 'var(--text-faint)'
    }
  }, description)));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Field.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Field({
  label,
  hint,
  error,
  required,
  children,
  htmlFor,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      ...style
    }
  }, rest), label && /*#__PURE__*/React.createElement("label", {
    htmlFor: htmlFor,
    style: {
      font: 'var(--weight-medium) var(--size-sm)/1.3 var(--font-sans)',
      color: 'var(--text-body)'
    }
  }, label, required && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--gv-danger-600)',
      marginLeft: 3
    }
  }, "*")), children, (error || hint) && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--weight-regular) var(--size-xs)/1.4 var(--font-sans)',
      color: error ? 'var(--gv-danger-600)' : 'var(--text-faint)'
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Field });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Field.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function fieldSurface(focus, invalid) {
  return {
    background: focus ? 'var(--surface-card)' : 'var(--surface-sunken)',
    boxShadow: invalid ? 'inset 0 0 0 1px var(--status-danger-fg)' + (focus ? ', var(--ring-danger)' : '') : focus ? 'inset 0 0 0 1px var(--brand-accent), var(--ring-focus)' : 'inset 0 0 0 1px transparent',
    border: 0,
    outline: 'none',
    transition: 'var(--transition-control)'
  };
}
function Input({
  icon,
  prefix,
  suffix,
  invalid,
  size = 'md',
  pill = false,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const h = size === 'sm' ? 'var(--control-height-sm)' : size === 'lg' ? 'var(--control-height-lg)' : 'var(--control-height)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-4)',
      height: h,
      padding: pill ? '0 14px' : '0 12px',
      borderRadius: pill ? 'var(--radius-pill)' : 'var(--radius-input)',
      ...fieldSurface(focus, invalid),
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 15,
    style: {
      color: 'var(--text-faint)'
    }
  }), prefix && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--weight-regular) var(--size-sm) var(--font-sans)',
      color: 'var(--text-faint)'
    }
  }, prefix), /*#__PURE__*/React.createElement("input", _extends({
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      flex: 1,
      minWidth: 0,
      height: '100%',
      border: 0,
      outline: 'none',
      background: 'transparent',
      font: 'var(--weight-regular) ' + (size === 'lg' ? 'var(--size-body)' : '13.5px') + ' var(--font-sans)',
      color: 'var(--text-body)'
    }
  }, rest)), suffix && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--weight-regular) var(--size-xs) var(--font-sans)',
      color: 'var(--text-faint)',
      whiteSpace: 'nowrap'
    }
  }, suffix));
}
Object.assign(__ds_scope, { fieldSurface, Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/SearchBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function SearchBar({
  placeholder = 'Buscar…',
  filters,
  onSubmit,
  buttonLabel = 'Buscar',
  bare = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("form", _extends({
    onSubmit: e => {
      e.preventDefault();
      onSubmit && onSubmit(e);
    },
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-4)',
      flexWrap: 'wrap',
      ...(bare ? null : {
        padding: 10,
        background: 'var(--surface-card)',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-sm)'
      }),
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Input, {
    pill: true,
    icon: "search",
    placeholder: placeholder,
    style: {
      flex: '1 1 220px'
    }
  }), filters, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    type: "submit",
    icon: "sliders-horizontal"
  }, buttonLabel));
}
Object.assign(__ds_scope, { SearchBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SearchBar.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Select({
  options = [],
  size = 'md',
  invalid,
  placeholder,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const h = size === 'sm' ? 'var(--control-height-sm)' : size === 'lg' ? 'var(--control-height-lg)' : 'var(--control-height)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      width: '100%',
      ...style
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      width: '100%',
      height: h,
      padding: '0 34px 0 12px',
      appearance: 'none',
      color: 'var(--text-body)',
      borderRadius: 'var(--radius-input)',
      cursor: 'pointer',
      font: 'var(--weight-regular) 13.5px var(--font-sans)',
      ...__ds_scope.fieldSurface(focus, invalid)
    }
  }, rest), placeholder && /*#__PURE__*/React.createElement("option", {
    value: ""
  }, placeholder), options.map(o => {
    const opt = typeof o === 'string' ? {
      value: o,
      label: o
    } : o;
    return /*#__PURE__*/React.createElement("option", {
      key: opt.value,
      value: opt.value
    }, opt.label);
  })), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 15,
    style: {
      position: 'absolute',
      right: 12,
      color: 'var(--text-faint)',
      pointerEvents: 'none'
    }
  }));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Switch({
  checked,
  onChange,
  label,
  disabled,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-5)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: !!checked,
    onChange: onChange,
    readOnly: !onChange,
    disabled: disabled,
    style: {
      position: 'absolute',
      opacity: 0,
      width: 0,
      height: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      width: 36,
      height: 20,
      flex: '0 0 auto',
      background: checked ? 'var(--brand-primary)' : 'var(--gv-ink-200)',
      borderRadius: 'var(--radius-pill)',
      transition: 'background-color var(--dur-fast) var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 2,
      left: checked ? 18 : 2,
      width: 16,
      height: 16,
      background: 'var(--gv-white)',
      borderRadius: '50%',
      boxShadow: 'var(--shadow-xs)',
      transition: 'left var(--dur-fast) var(--ease-out)'
    }
  })), label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--weight-regular) var(--size-sm) var(--font-sans)',
      color: 'var(--text-body)'
    }
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Textarea({
  invalid,
  rows = 4,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("textarea", _extends({
    rows: rows,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      width: '100%',
      padding: '10px 12px',
      resize: 'vertical',
      color: 'var(--text-body)',
      borderRadius: 'var(--radius-input)',
      font: 'var(--weight-regular) 13.5px/var(--lh-normal) var(--font-sans)',
      ...__ds_scope.fieldSurface(focus, invalid),
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SidebarNav.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function SidebarNav({
  items = [],
  active,
  onSelect,
  footer,
  collapsed = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("nav", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
      overflow: 'hidden',
      width: collapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)',
      flex: '0 0 auto',
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-card)',
      boxShadow: 'var(--shadow-sm)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: collapsed ? 'center' : 'flex-start',
      gap: 2,
      padding: collapsed ? '16px 0 12px' : '22px 22px 18px'
    }
  }, collapsed ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 12,
      background: 'var(--brand-primary)',
      color: 'var(--gv-gold-100)',
      display: 'grid',
      placeItems: 'center',
      font: 'var(--weight-medium) 14px/1 var(--font-display)',
      letterSpacing: '.06em'
    }
  }, "GV") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("b", {
    style: {
      font: 'var(--weight-medium) 15px/1.2 var(--font-display)',
      letterSpacing: 'var(--tracking-brand)',
      color: 'var(--brand-primary)'
    }
  }, "GRAND VISTA"), /*#__PURE__*/React.createElement("small", {
    style: {
      font: '10px/1.2 var(--font-display)',
      letterSpacing: '.3em',
      textTransform: 'uppercase',
      color: 'var(--brand-accent-ink)'
    }
  }, "Fazendas"))), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      margin: 0,
      padding: collapsed ? '4px 10px 10px' : '4px 12px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      flex: 1,
      overflowY: 'auto'
    }
  }, items.map(it => it.section ? collapsed ? /*#__PURE__*/React.createElement("li", {
    key: it.section,
    "aria-hidden": "true",
    style: {
      height: 1,
      margin: '10px 8px',
      background: 'var(--border-subtle)'
    }
  }) : /*#__PURE__*/React.createElement("li", {
    key: it.section,
    style: {
      padding: '16px 12px 6px',
      fontSize: 11,
      color: 'var(--text-faint)'
    }
  }, it.section) : /*#__PURE__*/React.createElement("li", {
    key: it.id
  }, /*#__PURE__*/React.createElement(NavItem, {
    item: it,
    active: active === it.id,
    collapsed: collapsed,
    onSelect: onSelect
  })))), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: collapsed ? 'center' : 'flex-start',
      gap: 10,
      padding: 14,
      borderTop: '1px solid var(--border-subtle)'
    }
  }, footer));
}
function NavItem({
  item,
  active,
  collapsed,
  onSelect
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    onClick: () => onSelect && onSelect(item.id),
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    title: collapsed ? item.label : undefined,
    "aria-current": active ? 'page' : undefined,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      width: '100%',
      height: 40,
      padding: collapsed ? 0 : '0 12px',
      justifyContent: collapsed ? 'center' : 'flex-start',
      background: active ? 'var(--surface-inverse)' : hover ? 'var(--surface-sunken)' : 'transparent',
      color: active ? '#fff' : hover ? 'var(--text-body)' : 'var(--text-muted)',
      boxShadow: active ? 'var(--shadow-nav-active)' : 'none',
      border: 0,
      borderRadius: 'var(--radius-nav)',
      cursor: 'pointer',
      font: 'var(--weight-regular) 14px/1 var(--font-sans)',
      textAlign: 'left',
      transition: 'var(--transition-control)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: item.icon,
    size: 18
  }), !collapsed && /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, item.label), !collapsed && item.badge != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontVariantNumeric: 'tabular-nums',
      color: active ? 'rgba(255,255,255,.6)' : 'var(--text-faint)'
    }
  }, item.badge));
}
Object.assign(__ds_scope, { SidebarNav });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SidebarNav.jsx", error: String((e && e.message) || e) }); }

// components/navigation/StageStepper.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function StageStepper({
  stages = [],
  current = 0,
  onSelect,
  compact = false,
  style,
  ...rest
}) {
  if (compact) {
    return /*#__PURE__*/React.createElement("div", _extends({
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        ...style
      }
    }, rest), /*#__PURE__*/React.createElement("ol", {
      style: {
        listStyle: 'none',
        display: 'flex',
        margin: 0,
        padding: 0,
        gap: 2
      }
    }, stages.map((s, i) => {
      const done = i < current,
        on = i === current;
      return /*#__PURE__*/React.createElement("li", {
        key: i,
        title: typeof s === 'string' ? s : undefined,
        onClick: () => onSelect && onSelect(i),
        style: {
          flex: '1 1 0',
          minWidth: 0,
          height: 4,
          borderRadius: 'var(--radius-pill)',
          cursor: onSelect ? 'pointer' : 'default',
          background: done ? 'var(--gv-green-500)' : on ? 'var(--brand-accent)' : 'var(--gv-ink-100)'
        }
      });
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 'var(--space-5)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        font: 'var(--weight-medium) var(--size-sm) var(--font-sans)',
        color: 'var(--text-heading)'
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: "chevron-right",
      size: 13,
      style: {
        color: 'var(--brand-accent)'
      }
    }), stages[current]), /*#__PURE__*/React.createElement("span", {
      className: "gv-num",
      style: {
        fontSize: 'var(--size-micro)',
        color: 'var(--text-faint)',
        whiteSpace: 'nowrap'
      }
    }, "etapa ", current + 1, " de ", stages.length)));
  }
  return /*#__PURE__*/React.createElement("ol", _extends({
    style: {
      listStyle: 'none',
      display: 'flex',
      margin: 0,
      padding: 0,
      gap: 2,
      overflowX: 'auto',
      ...style
    }
  }, rest), stages.map((s, i) => {
    const done = i < current,
      on = i === current;
    return /*#__PURE__*/React.createElement("li", {
      key: i,
      style: {
        flex: '1 1 0',
        minWidth: 96
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => onSelect && onSelect(i),
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        width: '100%',
        padding: 0,
        background: 'none',
        border: 0,
        cursor: onSelect ? 'pointer' : 'default',
        textAlign: 'left'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        height: 4,
        borderRadius: 'var(--radius-pill)',
        background: done ? 'var(--gv-green-500)' : on ? 'var(--brand-accent)' : 'var(--gv-ink-100)'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        font: `${on ? 'var(--weight-medium)' : 'var(--weight-regular)'} var(--size-micro)/1.3 var(--font-sans)`,
        color: on ? 'var(--text-heading)' : done ? 'var(--text-muted)' : 'var(--text-faint)'
      }
    }, done && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: "check",
      size: 11
    }), s)));
  }));
}
Object.assign(__ds_scope, { StageStepper });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/StageStepper.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Tabs({
  items = [],
  active,
  onSelect,
  variant = 'segmented',
  size = 'md',
  style,
  ...rest
}) {
  const seg = variant === 'segmented';
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "tablist",
    style: seg ? {
      display: 'inline-flex',
      gap: 2,
      padding: 4,
      borderRadius: 'var(--radius-pill)',
      background: 'var(--surface-sunken)',
      maxWidth: '100%',
      overflowX: 'auto',
      scrollbarWidth: 'none',
      ...style
    } : {
      display: 'flex',
      gap: 'var(--space-7)',
      borderBottom: '1px solid var(--border-subtle)',
      overflowX: 'auto',
      scrollbarWidth: 'none',
      ...style
    }
  }, rest), items.map(it => {
    const on = active === it.id;
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      role: "tab",
      "aria-selected": on,
      onClick: () => onSelect && onSelect(it.id),
      style: seg ? {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        flex: '0 0 auto',
        height: size === 'sm' ? 26 : 30,
        padding: '0 13px',
        border: 0,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        borderRadius: 'var(--radius-pill)',
        background: on ? 'var(--surface-card)' : 'transparent',
        boxShadow: on ? 'var(--shadow-xs)' : 'none',
        color: on ? 'var(--text-heading)' : 'var(--text-muted)',
        font: (on ? 'var(--weight-medium)' : 'var(--weight-regular)') + ' 12.5px/1 var(--font-sans)',
        transition: 'var(--transition-control)'
      } : {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        flex: '0 0 auto',
        padding: '0 0 12px',
        background: 'none',
        border: 0,
        whiteSpace: 'nowrap',
        borderBottom: '2px solid ' + (on ? 'var(--text-heading)' : 'transparent'),
        marginBottom: -1,
        cursor: 'pointer',
        color: on ? 'var(--text-heading)' : 'var(--text-muted)',
        font: (on ? 'var(--weight-medium)' : 'var(--weight-regular)') + ' 13.5px/1 var(--font-sans)',
        transition: 'var(--transition-control)'
      }
    }, it.icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: it.icon,
      size: 15
    }), it.label, it.count != null && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: 'var(--text-faint)',
        fontVariantNumeric: 'tabular-nums'
      }
    }, it.count));
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TopBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function TopBar({
  title,
  breadcrumb,
  search,
  actions,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("header", _extends({
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-6)',
      height: 'var(--topbar-height)',
      flex: '0 0 auto',
      padding: '0 12px 0 20px',
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-card)',
      boxShadow: 'var(--shadow-sm)',
      ...style
    }
  }, rest), (breadcrumb || title) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      minWidth: 0
    }
  }, breadcrumb && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--text-faint)',
      whiteSpace: 'nowrap'
    }
  }, breadcrumb), title && /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 16,
      fontWeight: 'var(--weight-semibold)',
      letterSpacing: 'var(--tracking-tight)',
      lineHeight: 1.2,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, title)), search && /*#__PURE__*/React.createElement("div", {
    style: {
      flex: '0 1 340px',
      minWidth: 0,
      marginLeft: title || breadcrumb ? 'auto' : 0
    }
  }, search), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginLeft: 'auto'
    }
  }, actions));
}
Object.assign(__ds_scope, { TopBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TopBar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/crm-v2/Dashboard.jsx
try { (() => {
const A2_SERIES = {
  leads: {
    label: 'Leads',
    max: 40,
    ticks: ['40', '30', '20', '10'],
    fmt: v => v,
    base: [12, 18, 15, 22, 9, 7, 19, 24, 21, 26, 14, 8, 11, 23, 27, 25, 29, 17, 10, 13, 28, 31, 26, 34, 0, 0, 0, 0, 0, 0, 0],
    prev: [10, 14, 13, 18, 8, 6, 15, 20, 19, 21, 12, 9, 10, 18, 22, 20, 23, 15, 9, 11, 22, 24, 21, 25, 23, 19, 12, 10, 20, 22, 18]
  },
  visitas: {
    label: 'Visitas',
    max: 8,
    ticks: ['8', '6', '4', '2'],
    fmt: v => v,
    base: [2, 3, 1, 4, 0, 0, 3, 5, 2, 4, 1, 0, 1, 3, 6, 4, 5, 2, 0, 1, 4, 5, 3, 6, 0, 0, 0, 0, 0, 0, 0],
    prev: [1, 2, 2, 3, 0, 0, 2, 3, 2, 3, 1, 0, 1, 2, 4, 3, 3, 2, 0, 1, 3, 4, 2, 4, 3, 2, 1, 0, 2, 3, 2]
  },
  propostas: {
    label: 'Propostas',
    max: 4,
    ticks: ['4', '3', '2', '1'],
    fmt: v => v,
    base: [0, 1, 0, 1, 0, 0, 1, 2, 1, 0, 1, 0, 0, 1, 2, 1, 3, 1, 0, 0, 1, 2, 1, 3, 0, 0, 0, 0, 0, 0, 0],
    prev: [0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 2, 0, 0, 0, 1, 1, 1, 2, 1, 1, 0, 0, 1, 1, 1]
  }
};
const A2_TODAY = 24;
function A2Kpi({
  label,
  value,
  delta,
  rows,
  hero,
  heroStyle
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: 'a2-card a2-kpi' + (hero ? ' hero ' + heroStyle : '')
  }, /*#__PURE__*/React.createElement("div", {
    className: "a2-kpi-top"
  }, /*#__PURE__*/React.createElement("span", null, label), /*#__PURE__*/React.createElement("span", {
    className: "a2-tag-mini"
  }, hero ? 'Destaque' : 'Julho')), /*#__PURE__*/React.createElement("div", {
    className: "a2-kpi-val"
  }, /*#__PURE__*/React.createElement("b", null, value), delta != null && /*#__PURE__*/React.createElement(A2Delta, {
    v: delta
  })), /*#__PURE__*/React.createElement("div", {
    className: "a2-kpi-rows"
  }, rows.flatMap(([k, v]) => [/*#__PURE__*/React.createElement("span", {
    key: k
  }, k), /*#__PURE__*/React.createElement("span", {
    key: k + 'v'
  }, v)])));
}
function A2Chart() {
  const [metric, setMetric] = React.useState('leads');
  const [hover, setHover] = React.useState(A2_TODAY);
  const s = A2_SERIES[metric];
  const d = hover - 1;
  const diff = s.prev[d] ? Math.round((s.base[d] - s.prev[d]) / s.prev[d] * 100) : 0;
  return /*#__PURE__*/React.createElement("div", {
    className: "a2-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "a2-card-h"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", null, "Evolu\xE7\xE3o comercial"), /*#__PURE__*/React.createElement("p", null, "Di\xE1rio \xB7 julho vs. junho")), /*#__PURE__*/React.createElement(A2Seg, {
    value: metric,
    onChange: setMetric,
    options: Object.entries(A2_SERIES).map(([id, v]) => ({
      id,
      label: v.label
    }))
  })), /*#__PURE__*/React.createElement("div", {
    className: "a2-card-h",
    style: {
      paddingTop: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "a2-legend"
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("i", {
    style: {
      background: 'var(--a2-primary)'
    }
  }), "Julho"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("i", {
    style: {
      background: 'var(--a2-accent)',
      height: 3,
      borderRadius: 2,
      verticalAlign: 3
    }
  }), "Junho"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("i", {
    style: {
      background: 'repeating-linear-gradient(135deg,#F6F5F1 0 3px,#DCD9D0 3px 5px)'
    }
  }), "Restante do m\xEAs"))), /*#__PURE__*/React.createElement("div", {
    className: "a2-chart"
  }, /*#__PURE__*/React.createElement("div", {
    className: "a2-yaxis"
  }, s.ticks.map(t => /*#__PURE__*/React.createElement("span", {
    key: t
  }, t)), /*#__PURE__*/React.createElement("span", null, "0")), /*#__PURE__*/React.createElement("div", {
    className: "a2-bars-scroll"
  }, /*#__PURE__*/React.createElement("div", {
    className: "a2-bars",
    onMouseLeave: () => setHover(A2_TODAY)
  }, s.base.map((v, i) => {
    const day = i + 1;
    const fut = day > A2_TODAY;
    const h = fut ? 100 : Math.max(3, v / s.max * 100);
    const cls = 'a2-bar' + (day === A2_TODAY ? ' cur' : fut ? ' fut' : day === hover ? ' hl' : '');
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: cls,
      onMouseEnter: () => !fut && setHover(day)
    }, /*#__PURE__*/React.createElement("div", {
      className: "col",
      style: {
        height: h + '%'
      }
    }), !fut && /*#__PURE__*/React.createElement("span", {
      className: "prev",
      style: {
        bottom: s.prev[i] / s.max * 100 + '%'
      }
    }), /*#__PURE__*/React.createElement("span", {
      className: "x"
    }, String(day).padStart(2, '0')), day === hover && !fut && /*#__PURE__*/React.createElement("div", {
      className: "a2-tip",
      style: {
        left: i < 4 ? 0 : i > 26 ? 'auto' : '50%',
        right: i > 26 ? 0 : 'auto',
        transform: i < 4 || i > 26 ? 'none' : 'translateX(-50%)'
      }
    }, /*#__PURE__*/React.createElement("b", null, String(day).padStart(2, '0'), "/07/2026"), /*#__PURE__*/React.createElement("div", {
      className: "r"
    }, /*#__PURE__*/React.createElement("span", null, "Julho"), /*#__PURE__*/React.createElement("span", null, s.fmt(v))), /*#__PURE__*/React.createElement("div", {
      className: "r"
    }, /*#__PURE__*/React.createElement("span", null, "Junho"), /*#__PURE__*/React.createElement("span", null, s.fmt(s.prev[i]))), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(A2Delta, {
      v: diff
    }), " ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--a2-ink-3)'
      }
    }, "vs. m\xEAs anterior"))));
  })))));
}
function A2Dashboard({
  heroStyle,
  onOpenFarm,
  onNavigate
}) {
  const D = window.GV_DATA;
  const [period, setPeriod] = React.useState('mes');
  const maxPct = Math.max(...D.pipeline.map(p => p.pct));
  const icons = {
    visita: 'map-pin',
    mensagem: 'message-circle',
    ligacao: 'phone',
    nota: 'sticky-note'
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "a2-page"
  }, /*#__PURE__*/React.createElement(A2Head, {
    title: "Vis\xE3o geral",
    sub: "Todas as regi\xF5es \xB7 atualizado \xE0s 14h30"
  }, /*#__PURE__*/React.createElement("span", {
    className: "hide-m"
  }, /*#__PURE__*/React.createElement(A2Seg, {
    value: period,
    onChange: setPeriod,
    options: [{
      id: 'sem',
      label: 'Semana'
    }, {
      id: 'mes',
      label: 'Mês'
    }, {
      id: 'tri',
      label: 'Trimestre'
    }]
  })), /*#__PURE__*/React.createElement(A2Btn, {
    icon: "download",
    className: "hide-m"
  }, "Exportar"), /*#__PURE__*/React.createElement(A2Btn, {
    variant: "primary",
    orb: "sliders-horizontal",
    count: 2
  }, "Filtros")), /*#__PURE__*/React.createElement("div", {
    className: "a2-kpis"
  }, /*#__PURE__*/React.createElement(A2Kpi, {
    label: "Fazendas ativas",
    value: "128",
    delta: 6,
    rows: [['Novas no mês', '9'], ['Disponíveis', '84'], ['Doc. pendente', '11']]
  }), /*#__PURE__*/React.createElement(A2Kpi, {
    label: "Compradores qualificados",
    value: "342",
    delta: 12,
    rows: [['Quentes', '38'], ['Mornos', '121'], ['Frios', '183']]
  }), /*#__PURE__*/React.createElement(A2Kpi, {
    hero: true,
    heroStyle: heroStyle,
    label: "Valor em negocia\xE7\xE3o",
    value: "R$ 156,9 mi",
    delta: 19,
    rows: [['Oportunidades', '47'], ['Ticket médio', 'R$ 3,3 mi'], ['Previsão de fechamento', 'R$ 26,9 mi']]
  }), /*#__PURE__*/React.createElement(A2Kpi, {
    label: "Taxa de convers\xE3o",
    value: "4,8%",
    delta: -2,
    rows: [['Lead → visita', '22%'], ['Visita → proposta', '41%'], ['Proposta → fechamento', '53%']]
  })), /*#__PURE__*/React.createElement("div", {
    className: "a2-grid-2"
  }, /*#__PURE__*/React.createElement(A2Chart, null), /*#__PURE__*/React.createElement("div", {
    className: "a2-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "a2-card-h"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", null, "Funil por etapa"), /*#__PURE__*/React.createElement("p", null, "Valor em cada fase")), /*#__PURE__*/React.createElement(A2Btn, {
    variant: "ghost",
    size: "sm",
    onClick: () => onNavigate('pipeline')
  }, "Ver pipeline")), /*#__PURE__*/React.createElement("div", {
    className: "a2-funnel"
  }, D.pipeline.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.stage,
    className: "a2-funnel-row"
  }, /*#__PURE__*/React.createElement("span", null, p.stage), /*#__PURE__*/React.createElement("b", null, p.total), /*#__PURE__*/React.createElement("span", {
    className: "bar"
  }, /*#__PURE__*/React.createElement("i", {
    style: {
      width: p.pct / maxPct * 100 + '%',
      opacity: .35 + p.index / 14
    }
  }))))))), /*#__PURE__*/React.createElement("div", {
    className: "a2-grid-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "a2-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "a2-card-h"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", null, "Fazendas em destaque"), /*#__PURE__*/React.createElement("p", null, "Prioridade alta \xB7 mais buscadas")), /*#__PURE__*/React.createElement(A2Btn, {
    variant: "ghost",
    size: "sm",
    onClick: () => onNavigate('fazendas')
  }, "Ver todas")), /*#__PURE__*/React.createElement("div", {
    className: "a2-list"
  }, D.fazendas.filter(f => f.prior === 'Alta').map(f => /*#__PURE__*/React.createElement("div", {
    key: f.id,
    className: "a2-li",
    onClick: () => onOpenFarm(f)
  }, /*#__PURE__*/React.createElement("span", {
    className: "a2-ico"
  }, /*#__PURE__*/React.createElement(A2Icon, {
    name: "tractor",
    size: 17
  })), /*#__PURE__*/React.createElement("span", {
    className: "t"
  }, /*#__PURE__*/React.createElement("b", null, f.nome), /*#__PURE__*/React.createElement("span", null, f.mun, " \xB7 ", f.area, " ha")), /*#__PURE__*/React.createElement("span", {
    className: "num",
    style: {
      fontSize: 13,
      fontWeight: 500
    }
  }, "R$ ", f.ha, "/ha"), /*#__PURE__*/React.createElement(A2Pill, {
    tone: f.tone
  }, f.status))))), /*#__PURE__*/React.createElement("div", {
    className: "a2-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "a2-card-h"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", null, "Atividade recente"))), /*#__PURE__*/React.createElement("div", {
    className: "a2-list"
  }, D.atividades.map(a => /*#__PURE__*/React.createElement("div", {
    key: a.title,
    className: "a2-li"
  }, /*#__PURE__*/React.createElement("span", {
    className: "a2-ico"
  }, /*#__PURE__*/React.createElement(A2Icon, {
    name: icons[a.kind],
    size: 16
  })), /*#__PURE__*/React.createElement("span", {
    className: "t"
  }, /*#__PURE__*/React.createElement("b", null, a.title), /*#__PURE__*/React.createElement("span", null, a.date, " \xB7 ", a.author))))))));
}
Object.assign(window, {
  A2Dashboard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/crm-v2/Dashboard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/crm-v2/Drawers.jsx
try { (() => {
function A2Sheet({
  onClose,
  short,
  children,
  label
}) {
  React.useEffect(() => {
    const k = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "a2-scrim",
    onClick: onClose
  }), /*#__PURE__*/React.createElement("div", {
    className: 'a2-drawer' + (short ? ' short' : ''),
    role: "dialog",
    "aria-label": label
  }, /*#__PURE__*/React.createElement("div", {
    className: "a2-grab"
  }), children));
}
function A2FarmDrawer({
  farm,
  onClose,
  onStep,
  onSend
}) {
  const D = window.GV_DATA;
  const ddIc = {
    ok: ['check', 'var(--a2-success)', 'var(--a2-success-soft)'],
    pending: ['clock', 'var(--a2-warning)', 'var(--a2-warning-soft)'],
    blocked: ['alert-triangle', 'var(--a2-danger)', 'var(--a2-danger-soft)'],
    empty: ['circle-dashed', 'var(--a2-ink-3)', 'var(--a2-surface-2)']
  };
  const ddTone = {
    Concluído: 'success',
    'Em análise': 'warning',
    Pendência: 'danger'
  };
  return /*#__PURE__*/React.createElement(A2Sheet, {
    onClose: onClose,
    label: farm.nome
  }, /*#__PURE__*/React.createElement("div", {
    className: "a2-drawer-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono"
  }, "FAZENDA ", farm.id), /*#__PURE__*/React.createElement("h2", null, farm.nome)), /*#__PURE__*/React.createElement(A2IconBtn, {
    icon: "chevron-up",
    label: "Anterior",
    onClick: () => onStep(-1)
  }), /*#__PURE__*/React.createElement(A2IconBtn, {
    icon: "chevron-down",
    label: "Pr\xF3xima",
    onClick: () => onStep(1)
  }), /*#__PURE__*/React.createElement(A2IconBtn, {
    icon: "x",
    label: "Fechar",
    onClick: onClose
  })), /*#__PURE__*/React.createElement("div", {
    className: "a2-drawer-b"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(A2Pill, {
    tone: farm.tone
  }, farm.status), /*#__PURE__*/React.createElement(A2Pill, {
    tone: "gold",
    dot: false
  }, "Prioridade ", farm.prior.toLowerCase()), /*#__PURE__*/React.createElement("span", {
    className: "a2-chip"
  }, farm.apt)), /*#__PURE__*/React.createElement("div", {
    style: {
      aspectRatio: '16/8',
      borderRadius: 'var(--a2-r-md)',
      background: 'repeating-linear-gradient(135deg,var(--a2-surface-2) 0 10px,var(--a2-surface-3) 10px 20px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 12,
      color: 'var(--a2-ink-3)',
      fontFamily: 'var(--a2-font-mono)'
    }
  }, "foto a\xE9rea da propriedade"), /*#__PURE__*/React.createElement("div", {
    className: "a2-mini-cards"
  }, /*#__PURE__*/React.createElement("div", {
    className: "a2-mini"
  }, "\xC1rea total", /*#__PURE__*/React.createElement("b", null, farm.area, " ha"), /*#__PURE__*/React.createElement("span", null, farm.util, " ha \xFAteis")), /*#__PURE__*/React.createElement("div", {
    className: "a2-mini"
  }, "Valor por hectare", /*#__PURE__*/React.createElement("b", null, "R$ ", farm.ha), /*#__PURE__*/React.createElement("span", null, farm.sacas, " sc/ha"))), /*#__PURE__*/React.createElement("div", {
    className: "a2-sec"
  }, /*#__PURE__*/React.createElement("h4", null, "Ficha t\xE9cnica"), /*#__PURE__*/React.createElement("div", {
    className: "a2-kv"
  }, /*#__PURE__*/React.createElement("span", null, "Munic\xEDpio"), /*#__PURE__*/React.createElement("span", null, farm.mun), /*#__PURE__*/React.createElement("span", null, "Regi\xE3o"), /*#__PURE__*/React.createElement("span", null, farm.regiao), /*#__PURE__*/React.createElement("span", null, "\xC1gua"), /*#__PURE__*/React.createElement("span", null, farm.agua), /*#__PURE__*/React.createElement("span", null, "Potencial irriga\xE7\xE3o"), /*#__PURE__*/React.createElement("span", null, farm.irrig), /*#__PURE__*/React.createElement("span", null, "Rodovia"), /*#__PURE__*/React.createElement("span", null, farm.rodovia), /*#__PURE__*/React.createElement("span", null, "Armaz\xE9m"), /*#__PURE__*/React.createElement("span", null, farm.armazem), /*#__PURE__*/React.createElement("span", null, "Corretor"), /*#__PURE__*/React.createElement("span", null, farm.corretor))), /*#__PURE__*/React.createElement("div", {
    className: "a2-sec"
  }, /*#__PURE__*/React.createElement("h4", null, "Due diligence ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 400,
      color: 'var(--a2-ink-3)'
    }
  }, "\xB7 2 de 5")), /*#__PURE__*/React.createElement("div", {
    className: "a2-dd"
  }, D.diligence.map(d => {
    const [ic, c, bg] = ddIc[d.state];
    return /*#__PURE__*/React.createElement("div", {
      key: d.label,
      className: "a2-dd-row"
    }, /*#__PURE__*/React.createElement("span", {
      className: "a2-dd-ic",
      style: {
        color: c,
        background: bg
      }
    }, /*#__PURE__*/React.createElement(A2Icon, {
      name: ic,
      size: 12
    })), /*#__PURE__*/React.createElement("span", {
      className: "t"
    }, d.label, /*#__PURE__*/React.createElement("small", null, d.meta)), d.badge && /*#__PURE__*/React.createElement(A2Pill, {
      tone: ddTone[d.badge],
      dot: false
    }, d.badge));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "a2-sec"
  }, /*#__PURE__*/React.createElement("h4", null, "Compradores compat\xEDveis"), /*#__PURE__*/React.createElement("div", {
    className: "a2-list",
    style: {
      padding: 0,
      margin: '0 -12px'
    }
  }, D.compradores.slice(0, 3).map(b => /*#__PURE__*/React.createElement("div", {
    key: b.nome,
    className: "a2-li"
  }, /*#__PURE__*/React.createElement("span", {
    className: "a2-avatar"
  }, initials(b.nome)), /*#__PURE__*/React.createElement("span", {
    className: "t"
  }, /*#__PURE__*/React.createElement("b", null, b.nome), /*#__PURE__*/React.createElement("span", null, b.ticket, " \xB7 ", b.hectares)), /*#__PURE__*/React.createElement(A2Score, {
    v: b.score
  })))))), /*#__PURE__*/React.createElement("div", {
    className: "a2-drawer-f"
  }, /*#__PURE__*/React.createElement(A2Btn, {
    variant: "soft",
    icon: "pencil"
  }, "Editar"), /*#__PURE__*/React.createElement("div", {
    className: "grow"
  }), /*#__PURE__*/React.createElement(A2Btn, {
    variant: "dark",
    icon: "send",
    onClick: onSend
  }, "Enviar a compradores")));
}
function A2Field({
  label,
  children
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      fontSize: 12.5,
      color: 'var(--a2-ink-2)'
    }
  }, label, children);
}
const a2Select = {
  height: 42,
  borderRadius: 12,
  border: 0,
  boxShadow: 'inset 0 0 0 1px var(--a2-line-strong)',
  padding: '0 12px',
  font: 'inherit',
  fontSize: 13.5,
  color: 'var(--a2-ink)',
  background: '#fff'
};
function A2FilterSheet({
  onClose,
  onApply
}) {
  const [apt, setApt] = React.useState('Todas');
  return /*#__PURE__*/React.createElement(A2Sheet, {
    onClose: onClose,
    short: true,
    label: "Filtros"
  }, /*#__PURE__*/React.createElement("div", {
    className: "a2-drawer-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, /*#__PURE__*/React.createElement("h2", null, "Filtros")), /*#__PURE__*/React.createElement(A2IconBtn, {
    icon: "x",
    label: "Fechar",
    onClick: onClose
  })), /*#__PURE__*/React.createElement("div", {
    className: "a2-drawer-b"
  }, /*#__PURE__*/React.createElement(A2Field, {
    label: "Regi\xE3o"
  }, /*#__PURE__*/React.createElement("select", {
    style: a2Select,
    defaultValue: "Oeste da Bahia"
  }, /*#__PURE__*/React.createElement("option", null, "Todas"), window.GV_DATA.regioes.map(r => /*#__PURE__*/React.createElement("option", {
    key: r.nome
  }, r.nome)))), /*#__PURE__*/React.createElement(A2Field, {
    label: "Aptid\xE3o"
  }, /*#__PURE__*/React.createElement(A2Seg, {
    value: apt,
    onChange: setApt,
    options: ['Todas', 'Lavoura', 'Pecuária', 'Mista']
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(A2Field, {
    label: "\xC1rea m\xEDnima (ha)"
  }, /*#__PURE__*/React.createElement("input", {
    style: a2Select,
    defaultValue: "500",
    inputMode: "numeric"
  })), /*#__PURE__*/React.createElement(A2Field, {
    label: "\xC1rea m\xE1xima (ha)"
  }, /*#__PURE__*/React.createElement("input", {
    style: a2Select,
    defaultValue: "3.000",
    inputMode: "numeric"
  }))), /*#__PURE__*/React.createElement(A2Field, {
    label: "Corretor"
  }, /*#__PURE__*/React.createElement("select", {
    style: a2Select
  }, /*#__PURE__*/React.createElement("option", null, "Todos"), /*#__PURE__*/React.createElement("option", null, "Milson"), /*#__PURE__*/React.createElement("option", null, "Renata C."), /*#__PURE__*/React.createElement("option", null, "Diego A."))), /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      fontSize: 13.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "a2-check on"
  }, /*#__PURE__*/React.createElement(A2Icon, {
    name: "check",
    size: 13
  })), "Somente documenta\xE7\xE3o regular")), /*#__PURE__*/React.createElement("div", {
    className: "a2-drawer-f"
  }, /*#__PURE__*/React.createElement(A2Btn, {
    variant: "soft",
    onClick: onClose
  }, "Limpar tudo"), /*#__PURE__*/React.createElement("div", {
    className: "grow"
  }), /*#__PURE__*/React.createElement(A2Btn, {
    variant: "dark",
    onClick: onApply
  }, "Aplicar filtros")));
}
Object.assign(window, {
  A2FarmDrawer,
  A2FilterSheet
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/crm-v2/Drawers.jsx", error: String((e && e.message) || e) }); }

// ui_kits/crm-v2/Fazendas.jsx
try { (() => {
function A2Fazendas({
  onOpenFarm,
  onFilters,
  onToast
}) {
  const all = window.GV_DATA.fazendas;
  const [tab, setTab] = React.useState('all');
  const [q, setQ] = React.useState('');
  const [sel, setSel] = React.useState([]);
  const counts = s => all.filter(f => f.status === s).length;
  const tabs = [{
    id: 'all',
    label: 'Todas',
    n: 128
  }, {
    id: 'Disponível',
    label: 'Disponível',
    n: counts('Disponível')
  }, {
    id: 'Em negociação',
    label: 'Em negociação',
    n: counts('Em negociação')
  }, {
    id: 'Doc. pendente',
    label: 'Doc. pendente',
    n: counts('Doc. pendente')
  }, {
    id: 'Reservada',
    label: 'Reservada',
    n: counts('Reservada')
  }];
  const rows = all.filter(f => (tab === 'all' || f.status === tab) && (f.nome + f.mun + f.id).toLowerCase().includes(q.toLowerCase()));
  const toggle = id => setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const allOn = rows.length > 0 && rows.every(r => sel.includes(r.id));
  const prior = {
    Alta: 'danger',
    Média: 'warning',
    Baixa: 'neutral'
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "a2-page"
  }, /*#__PURE__*/React.createElement(A2Head, {
    title: "Fazendas",
    sub: "128 fazendas \xB7 84 dispon\xEDveis"
  }, /*#__PURE__*/React.createElement(A2Btn, {
    icon: "columns-3",
    className: "hide-m"
  }, "Colunas"), /*#__PURE__*/React.createElement(A2Btn, {
    icon: "sliders-horizontal",
    count: 2,
    onClick: onFilters
  }, "Filtros"), /*#__PURE__*/React.createElement(A2Btn, {
    variant: "primary",
    orb: "plus",
    className: "hide-m"
  }, "Cadastrar fazenda")), /*#__PURE__*/React.createElement("div", {
    className: "a2-card a2-strip"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, "\xC1rea total em carteira"), /*#__PURE__*/React.createElement("b", null, "186.420 ha")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, "Valor m\xE9dio por hectare"), /*#__PURE__*/React.createElement("b", null, "R$ 68.400")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, "Em negocia\xE7\xE3o"), /*#__PURE__*/React.createElement("b", null, "23")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, "Documenta\xE7\xE3o pendente"), /*#__PURE__*/React.createElement("b", {
    style: {
      color: 'var(--a2-warning)'
    }
  }, "11"))), /*#__PURE__*/React.createElement("div", {
    className: "a2-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "a2-toolbar"
  }, /*#__PURE__*/React.createElement(A2Seg, {
    value: tab,
    onChange: setTab,
    options: tabs
  }), /*#__PURE__*/React.createElement("div", {
    className: "grow hide-m"
  }), /*#__PURE__*/React.createElement("label", {
    className: "a2-tsearch"
  }, /*#__PURE__*/React.createElement(A2Icon, {
    name: "search",
    size: 15
  }), /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "Nome, munic\xEDpio ou c\xF3digo"
  })), /*#__PURE__*/React.createElement(A2IconBtn, {
    icon: "refresh-cw",
    label: "Atualizar",
    plain: true,
    size: 16
  }), /*#__PURE__*/React.createElement(A2IconBtn, {
    icon: "download",
    label: "Exportar lista",
    plain: true,
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "a2-twrap"
  }, /*#__PURE__*/React.createElement("table", {
    className: "a2-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    style: {
      width: 44
    }
  }, /*#__PURE__*/React.createElement(A2Check, {
    on: allOn,
    label: "Selecionar todas",
    onClick: () => setSel(allOn ? [] : rows.map(r => r.id))
  })), /*#__PURE__*/React.createElement("th", null, "Fazenda"), /*#__PURE__*/React.createElement("th", null, "Munic\xEDpio"), /*#__PURE__*/React.createElement("th", {
    className: "r"
  }, "\xC1rea total"), /*#__PURE__*/React.createElement("th", {
    className: "r"
  }, "\xC1rea \xFAtil"), /*#__PURE__*/React.createElement("th", {
    className: "r"
  }, "Valor/ha"), /*#__PURE__*/React.createElement("th", null, "Aptid\xE3o"), /*#__PURE__*/React.createElement("th", null, "Corretor"), /*#__PURE__*/React.createElement("th", null, "Status"), /*#__PURE__*/React.createElement("th", null, "Prioridade"), /*#__PURE__*/React.createElement("th", {
    className: "r"
  }, "A\xE7\xF5es"))), /*#__PURE__*/React.createElement("tbody", null, rows.map(f => /*#__PURE__*/React.createElement("tr", {
    key: f.id,
    className: sel.includes(f.id) ? 'sel' : '',
    onClick: () => onOpenFarm(f)
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(A2Check, {
    on: sel.includes(f.id),
    onClick: () => toggle(f.id)
  })), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
    className: "name"
  }, f.nome), /*#__PURE__*/React.createElement("div", {
    className: "mono"
  }, f.id)), /*#__PURE__*/React.createElement("td", {
    style: {
      color: 'var(--a2-ink-2)'
    }
  }, f.mun), /*#__PURE__*/React.createElement("td", {
    className: "r"
  }, f.area, " ha"), /*#__PURE__*/React.createElement("td", {
    className: "r",
    style: {
      color: 'var(--a2-ink-2)'
    }
  }, f.util, " ha"), /*#__PURE__*/React.createElement("td", {
    className: "r",
    style: {
      fontWeight: 500
    }
  }, "R$ ", f.ha), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "a2-chip"
  }, f.apt)), /*#__PURE__*/React.createElement("td", {
    style: {
      color: 'var(--a2-ink-2)'
    }
  }, f.corretor), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(A2Pill, {
    tone: f.tone
  }, f.status)), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(A2Pill, {
    tone: prior[f.prior],
    dot: false
  }, f.prior)), /*#__PURE__*/React.createElement("td", {
    className: "r"
  }, /*#__PURE__*/React.createElement("div", {
    className: "row-actions",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement(A2IconBtn, {
    icon: "pencil",
    label: "Editar",
    plain: true,
    size: 15
  }), /*#__PURE__*/React.createElement(A2IconBtn, {
    icon: "send",
    label: "Enviar a comprador",
    plain: true,
    size: 15,
    onClick: () => onToast('Enviado a 4 compradores compatíveis', f.nome)
  }), /*#__PURE__*/React.createElement(A2IconBtn, {
    icon: "more-horizontal",
    label: "Mais a\xE7\xF5es",
    plain: true,
    size: 15
  })))))))), /*#__PURE__*/React.createElement("div", {
    className: "a2-cards"
  }, rows.map(f => /*#__PURE__*/React.createElement("div", {
    key: f.id,
    className: 'a2-mcard' + (sel.includes(f.id) ? ' sel' : ''),
    onClick: () => onOpenFarm(f)
  }, /*#__PURE__*/React.createElement("div", {
    className: "r1"
  }, /*#__PURE__*/React.createElement(A2Check, {
    on: sel.includes(f.id),
    onClick: () => toggle(f.id)
  }), /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, /*#__PURE__*/React.createElement("b", null, f.nome), /*#__PURE__*/React.createElement("span", {
    className: "mono"
  }, f.id, " \xB7 ", f.mun)), /*#__PURE__*/React.createElement(A2Pill, {
    tone: f.tone
  }, f.status)), /*#__PURE__*/React.createElement("div", {
    className: "r2"
  }, /*#__PURE__*/React.createElement("span", null, "\xC1rea", /*#__PURE__*/React.createElement("b", null, f.area, " ha")), /*#__PURE__*/React.createElement("span", null, "Valor/ha", /*#__PURE__*/React.createElement("b", null, "R$ ", f.ha)), /*#__PURE__*/React.createElement("span", null, "Aptid\xE3o", /*#__PURE__*/React.createElement("b", null, f.apt))))), !rows.length && /*#__PURE__*/React.createElement(A2Empty, {
    icon: "search-x",
    title: "Nenhuma fazenda encontrada"
  }, "Ajuste a busca ou troque o filtro de status.")), !rows.length && /*#__PURE__*/React.createElement("div", {
    className: "a2-twrap"
  }, /*#__PURE__*/React.createElement(A2Empty, {
    icon: "search-x",
    title: "Nenhuma fazenda encontrada"
  }, "Ajuste a busca ou troque o filtro de status.")), /*#__PURE__*/React.createElement("div", {
    className: "a2-tfoot"
  }, /*#__PURE__*/React.createElement("span", null, "1\u2013", rows.length, " de 128"), /*#__PURE__*/React.createElement("div", {
    className: "a2-pager"
  }, /*#__PURE__*/React.createElement("button", {
    className: "txt hide-m"
  }, "Anterior"), /*#__PURE__*/React.createElement("button", {
    className: "on"
  }, "1"), /*#__PURE__*/React.createElement("button", null, "2"), /*#__PURE__*/React.createElement("button", null, "3"), /*#__PURE__*/React.createElement("span", {
    className: "hide-m"
  }, "\u2026"), /*#__PURE__*/React.createElement("button", {
    className: "hide-m"
  }, "22"), /*#__PURE__*/React.createElement("button", {
    className: "txt"
  }, "Pr\xF3xima")))), sel.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "a2-bulk",
    role: "toolbar",
    "aria-label": "A\xE7\xF5es em lote"
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, sel.length), " selecionada", sel.length > 1 ? 's' : ''), /*#__PURE__*/React.createElement(A2Btn, {
    size: "sm",
    icon: "user-round-cog",
    className: "hide-m"
  }, "Trocar corretor"), /*#__PURE__*/React.createElement(A2Btn, {
    size: "sm",
    icon: "download",
    className: "hide-m"
  }, "Exportar"), /*#__PURE__*/React.createElement(A2Btn, {
    size: "sm",
    variant: "primary",
    icon: "send",
    onClick: () => {
      onToast('Oportunidade enviada', `${sel.length} fazenda(s) para compradores compatíveis`);
      setSel([]);
    }
  }, "Enviar"), /*#__PURE__*/React.createElement(A2IconBtn, {
    icon: "x",
    label: "Limpar sele\xE7\xE3o",
    plain: true,
    size: 16,
    onClick: () => setSel([])
  })));
}
Object.assign(window, {
  A2Fazendas
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/crm-v2/Fazendas.jsx", error: String((e && e.message) || e) }); }

// ui_kits/crm-v2/Pipeline.jsx
try { (() => {
function A2Deal({
  d,
  onOpen
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "a2-deal",
    onClick: onOpen
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "c"
  }, d.client), /*#__PURE__*/React.createElement("div", {
    className: "f"
  }, d.farm)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "v"
  }, d.value), /*#__PURE__*/React.createElement("span", {
    className: "a2-avatar sm"
  }, d.owner)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 11.5,
      color: 'var(--a2-ink-3)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "Probabilidade"), /*#__PURE__*/React.createElement("span", {
    className: "num",
    style: {
      color: 'var(--a2-ink)'
    }
  }, d.probability, "%")), /*#__PURE__*/React.createElement("div", {
    className: "a2-prob"
  }, /*#__PURE__*/React.createElement("i", {
    style: {
      width: d.probability + '%'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: 'foot' + (d.overdue ? ' late' : '')
  }, /*#__PURE__*/React.createElement(A2Icon, {
    name: d.overdue ? 'alert-circle' : 'calendar-clock',
    size: 14
  }), d.nextAction));
}
function A2Pipeline({
  onOpenFarm
}) {
  const P = window.GV_DATA.pipeline;
  const [stage, setStage] = React.useState(P[0].stage);
  const [owner, setOwner] = React.useState('all');
  const filt = ds => ds.filter(d => owner === 'all' || d.owner === owner);
  const open = () => onOpenFarm(window.GV_DATA.fazendas[0]);
  const cur = P.find(p => p.stage === stage);
  return /*#__PURE__*/React.createElement("div", {
    className: "a2-page",
    style: {
      maxWidth: 'none'
    }
  }, /*#__PURE__*/React.createElement(A2Head, {
    title: "Funil comercial",
    sub: "47 oportunidades \xB7 R$ 156,9 mi em negocia\xE7\xE3o"
  }, /*#__PURE__*/React.createElement(A2Seg, {
    value: owner,
    onChange: setOwner,
    options: [{
      id: 'all',
      label: 'Todos'
    }, {
      id: 'MS',
      label: 'Milson'
    }, {
      id: 'RC',
      label: 'Renata'
    }, {
      id: 'DA',
      label: 'Diego'
    }]
  }), /*#__PURE__*/React.createElement(A2Btn, {
    variant: "primary",
    orb: "plus",
    className: "hide-m"
  }, "Nova oportunidade")), /*#__PURE__*/React.createElement("div", {
    className: "a2-board"
  }, P.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.stage,
    className: "a2-lane"
  }, /*#__PURE__*/React.createElement("div", {
    className: "a2-lane-h"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 3,
      background: `var(--stage-${p.index})`
    }
  }), p.stage, /*#__PURE__*/React.createElement("span", {
    className: "n"
  }, filt(p.deals).length), /*#__PURE__*/React.createElement("span", {
    className: "v"
  }, p.total)), filt(p.deals).map(d => /*#__PURE__*/React.createElement(A2Deal, {
    key: d.client,
    d: d,
    onOpen: open
  })), !filt(p.deals).length && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '18px 8px',
      textAlign: 'center',
      fontSize: 12,
      color: 'var(--a2-ink-3)'
    }
  }, "Nenhuma oportunidade")))), /*#__PURE__*/React.createElement("div", {
    className: "a2-stagepick"
  }, /*#__PURE__*/React.createElement(A2Seg, {
    value: stage,
    onChange: setStage,
    options: P.map(p => ({
      id: p.stage,
      label: p.stage,
      n: filt(p.deals).length
    }))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 12.5,
      color: 'var(--a2-ink-3)',
      padding: '0 4px'
    }
  }, /*#__PURE__*/React.createElement("span", null, "Etapa ", cur.index, " de 10"), /*#__PURE__*/React.createElement("span", {
    className: "num",
    style: {
      color: 'var(--a2-ink)',
      fontWeight: 600
    }
  }, cur.total)), /*#__PURE__*/React.createElement("div", {
    className: "lane-list"
  }, filt(cur.deals).map(d => /*#__PURE__*/React.createElement(A2Deal, {
    key: d.client,
    d: d,
    onOpen: open
  }))), !filt(cur.deals).length && /*#__PURE__*/React.createElement("div", {
    className: "a2-card"
  }, /*#__PURE__*/React.createElement(A2Empty, {
    icon: "kanban",
    title: "Nenhuma oportunidade nesta etapa"
  }, "Troque a etapa ou o filtro de corretor."))));
}
function A2Compradores({
  onToast
}) {
  const B = window.GV_DATA.compradores;
  const [tab, setTab] = React.useState('all');
  const tone = {
    Quente: 'danger',
    Morno: 'warning',
    Frio: 'info'
  };
  const rows = B.filter(b => tab === 'all' || b.qualificacao === tab);
  return /*#__PURE__*/React.createElement("div", {
    className: "a2-page"
  }, /*#__PURE__*/React.createElement(A2Head, {
    title: "Compradores e investidores",
    sub: "342 cadastrados \xB7 38 quentes"
  }, /*#__PURE__*/React.createElement(A2Btn, {
    icon: "upload",
    className: "hide-m"
  }, "Importar"), /*#__PURE__*/React.createElement(A2Btn, {
    variant: "primary",
    orb: "plus",
    className: "hide-m"
  }, "Novo comprador")), /*#__PURE__*/React.createElement("div", {
    className: "a2-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "a2-toolbar"
  }, /*#__PURE__*/React.createElement(A2Seg, {
    value: tab,
    onChange: setTab,
    options: [{
      id: 'all',
      label: 'Todos',
      n: 342
    }, {
      id: 'Quente',
      label: 'Quentes',
      n: 38
    }, {
      id: 'Morno',
      label: 'Mornos',
      n: 121
    }, {
      id: 'Frio',
      label: 'Frios',
      n: 183
    }]
  }), /*#__PURE__*/React.createElement("div", {
    className: "grow hide-m"
  }), /*#__PURE__*/React.createElement("label", {
    className: "a2-tsearch"
  }, /*#__PURE__*/React.createElement(A2Icon, {
    name: "search",
    size: 15
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Nome, regi\xE3o ou cultura"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "a2-twrap"
  }, /*#__PURE__*/React.createElement("table", {
    className: "a2-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Comprador"), /*#__PURE__*/React.createElement("th", null, "Ticket"), /*#__PURE__*/React.createElement("th", null, "Faixa de \xE1rea"), /*#__PURE__*/React.createElement("th", null, "Regi\xF5es"), /*#__PURE__*/React.createElement("th", null, "Culturas"), /*#__PURE__*/React.createElement("th", null, "Qualifica\xE7\xE3o"), /*#__PURE__*/React.createElement("th", {
    className: "r"
  }, "Matching"), /*#__PURE__*/React.createElement("th", {
    className: "r"
  }, "A\xE7\xF5es"))), /*#__PURE__*/React.createElement("tbody", null, rows.map(b => /*#__PURE__*/React.createElement("tr", {
    key: b.nome
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "a2-avatar"
  }, initials(b.nome)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "name"
  }, b.nome), /*#__PURE__*/React.createElement("div", {
    className: "mono"
  }, b.tipo)))), /*#__PURE__*/React.createElement("td", {
    style: {
      fontWeight: 500
    }
  }, b.ticket), /*#__PURE__*/React.createElement("td", {
    style: {
      color: 'var(--a2-ink-2)'
    }
  }, b.hectares), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4
    }
  }, b.regioes.map(r => /*#__PURE__*/React.createElement("span", {
    key: r,
    className: "a2-chip"
  }, r)))), /*#__PURE__*/React.createElement("td", {
    style: {
      color: 'var(--a2-ink-2)'
    }
  }, b.culturas.join(', ')), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(A2Pill, {
    tone: tone[b.qualificacao]
  }, b.qualificacao)), /*#__PURE__*/React.createElement("td", {
    className: "r"
  }, /*#__PURE__*/React.createElement(A2Score, {
    v: b.score
  })), /*#__PURE__*/React.createElement("td", {
    className: "r"
  }, /*#__PURE__*/React.createElement("div", {
    className: "row-actions"
  }, /*#__PURE__*/React.createElement(A2IconBtn, {
    icon: "message-circle",
    label: "WhatsApp",
    plain: true,
    size: 15,
    onClick: () => onToast('Mensagem aberta no WhatsApp', b.nome)
  }), /*#__PURE__*/React.createElement(A2IconBtn, {
    icon: "mail",
    label: "E-mail",
    plain: true,
    size: 15
  }), /*#__PURE__*/React.createElement(A2IconBtn, {
    icon: "more-horizontal",
    label: "Mais a\xE7\xF5es",
    plain: true,
    size: 15
  })))))))), /*#__PURE__*/React.createElement("div", {
    className: "a2-cards"
  }, rows.map(b => /*#__PURE__*/React.createElement("div", {
    key: b.nome,
    className: "a2-mcard"
  }, /*#__PURE__*/React.createElement("div", {
    className: "r1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "a2-avatar"
  }, initials(b.nome)), /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, /*#__PURE__*/React.createElement("b", null, b.nome), /*#__PURE__*/React.createElement("span", {
    className: "mono"
  }, b.tipo, " \xB7 ", b.regioes.join(', '))), /*#__PURE__*/React.createElement(A2Pill, {
    tone: tone[b.qualificacao]
  }, b.qualificacao)), /*#__PURE__*/React.createElement("div", {
    className: "r2"
  }, /*#__PURE__*/React.createElement("span", null, "Ticket", /*#__PURE__*/React.createElement("b", null, b.ticket)), /*#__PURE__*/React.createElement("span", null, "\xC1rea", /*#__PURE__*/React.createElement("b", null, b.hectares.replace(' ha', ''))), /*#__PURE__*/React.createElement("span", null, "Matching", /*#__PURE__*/React.createElement("b", null, /*#__PURE__*/React.createElement(A2Score, {
    v: b.score
  })))))))));
}
Object.assign(window, {
  A2Pipeline,
  A2Compradores
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/crm-v2/Pipeline.jsx", error: String((e && e.message) || e) }); }

// ui_kits/crm-v2/Shell.jsx
try { (() => {
const A2_TABS = [{
  id: 'dashboard',
  label: 'Início',
  icon: 'layout-dashboard'
}, {
  id: 'fazendas',
  label: 'Fazendas',
  icon: 'tractor'
}, {
  id: 'pipeline',
  label: 'Pipeline',
  icon: 'kanban'
}, {
  id: 'compradores',
  label: 'Compradores',
  icon: 'users'
}, {
  id: '__menu',
  label: 'Menu',
  icon: 'menu'
}];
const A2Brand = () => /*#__PURE__*/React.createElement("div", {
  className: "a2-brand"
}, /*#__PURE__*/React.createElement("b", null, "GRAND VISTA"), /*#__PURE__*/React.createElement("small", null, "Fazendas \xB7 CRM"), /*#__PURE__*/React.createElement("span", {
  className: "a2-brand-mini"
}, "GV"));
function A2NavList({
  view,
  onNavigate
}) {
  return /*#__PURE__*/React.createElement("nav", {
    className: "a2-nav",
    "aria-label": "Navega\xE7\xE3o principal"
  }, window.GV_DATA.nav.map((n, i) => n.section ? /*#__PURE__*/React.createElement("div", {
    key: 's' + i,
    className: "a2-nav-sec"
  }, n.section) : /*#__PURE__*/React.createElement("button", {
    key: n.id,
    title: n.label,
    className: 'a2-nav-item' + (view === n.id ? ' is-active' : ''),
    onClick: () => onNavigate(n.id)
  }, /*#__PURE__*/React.createElement(A2Icon, {
    name: n.icon,
    size: 18
  }), /*#__PURE__*/React.createElement("span", {
    className: "lbl"
  }, n.label), n.badge && /*#__PURE__*/React.createElement("span", {
    className: "cnt"
  }, n.badge))));
}
function A2Sidebar({
  view,
  onNavigate
}) {
  return /*#__PURE__*/React.createElement("aside", {
    className: "a2-side"
  }, /*#__PURE__*/React.createElement(A2Brand, null), /*#__PURE__*/React.createElement(A2NavList, {
    view: view,
    onNavigate: onNavigate
  }), /*#__PURE__*/React.createElement("div", {
    className: "a2-side-foot"
  }, /*#__PURE__*/React.createElement("span", {
    className: "a2-avatar"
  }, "MS"), /*#__PURE__*/React.createElement("span", {
    className: "who"
  }, "Milson", /*#__PURE__*/React.createElement("small", null, "Diretor comercial"))));
}
function A2TopBar() {
  return /*#__PURE__*/React.createElement("header", {
    className: "a2-top"
  }, /*#__PURE__*/React.createElement("label", {
    className: "a2-search"
  }, /*#__PURE__*/React.createElement(A2Icon, {
    name: "search",
    size: 16
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Buscar fazenda, comprador ou oportunidade"
  }), /*#__PURE__*/React.createElement("kbd", null, "\u2318K")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "a2-top-meta"
  }, /*#__PURE__*/React.createElement("span", null, "Em negocia\xE7\xE3o"), /*#__PURE__*/React.createElement("b", null, "R$ 156,9 mi")), /*#__PURE__*/React.createElement("div", {
    className: "a2-top-meta",
    style: {
      marginRight: 4
    }
  }, /*#__PURE__*/React.createElement("span", null, "Pend\xEAncias"), /*#__PURE__*/React.createElement("b", null, "7 hoje")), /*#__PURE__*/React.createElement(A2IconBtn, {
    icon: "calendar-clock",
    label: "Agenda"
  }), /*#__PURE__*/React.createElement(A2IconBtn, {
    icon: "bell",
    label: "Alertas",
    dot: true
  }), /*#__PURE__*/React.createElement("div", {
    className: "a2-user"
  }, /*#__PURE__*/React.createElement("span", {
    className: "a2-avatar"
  }, "MS"), /*#__PURE__*/React.createElement("span", {
    className: "who"
  }, "Milson", /*#__PURE__*/React.createElement("small", null, "Diretor comercial")), /*#__PURE__*/React.createElement(A2Icon, {
    name: "chevron-down",
    size: 14,
    style: {
      color: 'var(--a2-ink-3)'
    }
  })));
}
function A2MobileTop() {
  return /*#__PURE__*/React.createElement("div", {
    className: "a2-mtop"
  }, /*#__PURE__*/React.createElement(A2Brand, null), /*#__PURE__*/React.createElement(A2IconBtn, {
    icon: "search",
    label: "Buscar"
  }), /*#__PURE__*/React.createElement(A2IconBtn, {
    icon: "bell",
    label: "Alertas",
    dot: true
  }), /*#__PURE__*/React.createElement("span", {
    className: "a2-avatar"
  }, "MS"));
}
function A2TabBar({
  view,
  onNavigate
}) {
  const known = A2_TABS.some(t => t.id === view);
  return /*#__PURE__*/React.createElement("nav", {
    className: "a2-tabbar",
    "aria-label": "Navega\xE7\xE3o"
  }, A2_TABS.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    className: view === t.id || t.id === '__menu' && !known ? 'on' : '',
    onClick: () => onNavigate(t.id)
  }, /*#__PURE__*/React.createElement(A2Icon, {
    name: t.icon,
    size: 20
  }), t.label)));
}
function A2MenuSheet({
  view,
  onNavigate,
  onClose
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "a2-scrim",
    onClick: onClose
  }), /*#__PURE__*/React.createElement("div", {
    className: "a2-drawer short a2-menu-sheet",
    role: "dialog",
    "aria-label": "Menu"
  }, /*#__PURE__*/React.createElement("div", {
    className: "a2-grab"
  }), /*#__PURE__*/React.createElement("div", {
    className: "a2-drawer-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, /*#__PURE__*/React.createElement("h2", null, "Menu")), /*#__PURE__*/React.createElement(A2IconBtn, {
    icon: "x",
    label: "Fechar",
    onClick: onClose
  })), /*#__PURE__*/React.createElement("div", {
    className: "a2-drawer-b",
    style: {
      paddingTop: 0
    }
  }, /*#__PURE__*/React.createElement(A2NavList, {
    view: view,
    onNavigate: id => {
      onNavigate(id);
      onClose();
    }
  }))));
}
Object.assign(window, {
  A2Sidebar,
  A2TopBar,
  A2MobileTop,
  A2TabBar,
  A2MenuSheet
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/crm-v2/Shell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/crm-v2/tweaks-panel.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
// Copied omelette starter. Re-running copy_starter_component with this kind overwrites this file with the latest version (page content is unaffected).

/* BEGIN USAGE */
// tweaks-panel.jsx
// Reusable Tweaks shell + form-control helpers.
// Exports (to window): useTweaks, TweaksPanel, TweakSection, TweakRow, TweakSlider,
//   TweakToggle, TweakRadio, TweakSelect, TweakText, TweakNumber, TweakColor, TweakButton.
//
// Owns the host protocol (listens for __activate_edit_mode / __deactivate_edit_mode,
// posts __edit_mode_available / __edit_mode_set_keys / __edit_mode_dismissed) so
// individual prototypes don't re-roll it. Ships a consistent set of controls so you
// don't hand-draw <input type="range">, segmented radios, steppers, etc.
//
// Usage (in an HTML file that loads React + Babel):
//
//   const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
//     "primaryColor": "#D97757",
//     "palette": ["#D97757", "#29261b", "#f6f4ef"],
//     "fontSize": 16,
//     "density": "regular",
//     "dark": false
//   }/*EDITMODE-END*/;
//
//   function App() {
//     const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
//     return (
//       <div style={{ fontSize: t.fontSize, color: t.primaryColor }}>
//         Hello
//         <TweaksPanel>
//           <TweakSection label="Typography" />
//           <TweakSlider label="Font size" value={t.fontSize} min={10} max={32} unit="px"
//                        onChange={(v) => setTweak('fontSize', v)} />
//           <TweakRadio  label="Density" value={t.density}
//                        options={['compact', 'regular', 'comfy']}
//                        onChange={(v) => setTweak('density', v)} />
//           <TweakSection label="Theme" />
//           <TweakColor  label="Primary" value={t.primaryColor}
//                        options={['#D97757', '#2A6FDB', '#1F8A5B', '#7A5AE0']}
//                        onChange={(v) => setTweak('primaryColor', v)} />
//           <TweakColor  label="Palette" value={t.palette}
//                        options={[['#D97757', '#29261b', '#f6f4ef'],
//                                  ['#475569', '#0f172a', '#f1f5f9']]}
//                        onChange={(v) => setTweak('palette', v)} />
//           <TweakToggle label="Dark mode" value={t.dark}
//                        onChange={(v) => setTweak('dark', v)} />
//         </TweaksPanel>
//       </div>
//     );
//   }
//
// TweakRadio is the segmented control for 2–3 short options (auto-falls-back to
// TweakSelect past ~16/~10 chars per label); reach for TweakSelect directly when
// options are many or long. For color tweaks always curate 3-4 options rather than
// a free picker; an option can also be a whole 2–5 color palette (the stored value
// is the array). The Tweak* controls are a floor, not a ceiling — build custom
// controls inside the panel if a tweak calls for UI they don't cover.
/* END USAGE */
// ─────────────────────────────────────────────────────────────────────────────

const __TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;box-sizing:border-box;min-width:0;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}

  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);
    box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),
    0 2px 6px rgba(0,0,0,.15)}
  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;
    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.1)}
  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
  .twk-chip>span>i:first-child{box-shadow:none}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
`;

// ── useTweaks ───────────────────────────────────────────────────────────────
// Single source of truth for tweak values. setTweak persists via the host
// (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
  // useState-style call doesn't write a "[object Object]" key into the persisted
  // JSON block.
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null ? keyOrEdits : {
      [keyOrEdits]: val
    };
    setValues(prev => ({
      ...prev,
      ...edits
    }));
    window.parent.postMessage({
      type: '__edit_mode_set_keys',
      edits
    }, '*');
    // Same-window signal so in-page listeners (deck-stage rail thumbnails)
    // can react — the parent message only reaches the host, not peers.
    window.dispatchEvent(new CustomEvent('tweakchange', {
      detail: edits
    }));
  }, []);
  return [values, setTweak];
}

// ── TweaksPanel ─────────────────────────────────────────────────────────────
// Floating shell. Registers the protocol listener BEFORE announcing
// availability — if the announce ran first, the host's activate could land
// before our handler exists and the toolbar toggle would silently no-op.
// The close button posts __edit_mode_dismissed so the host's toolbar toggle
// flips off in lockstep; the host echoes __deactivate_edit_mode back which
// is what actually hides the panel.
function TweaksPanel({
  title = 'Tweaks',
  children
}) {
  const [open, setOpen] = React.useState(false);
  const dragRef = React.useRef(null);
  const offsetRef = React.useRef({
    x: 16,
    y: 16
  });
  const PAD = 16;
  const clampToViewport = React.useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth,
      h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y))
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);
  React.useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return () => window.removeEventListener('resize', clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);
  React.useEffect(() => {
    const onMsg = e => {
      const t = e?.data?.type;
      if (t === '__activate_edit_mode') setOpen(true);else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({
      type: '__edit_mode_available'
    }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);
  const dismiss = () => {
    setOpen(false);
    window.parent.postMessage({
      type: '__edit_mode_dismissed'
    }, '*');
  };
  const onDragStart = e => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX,
      sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = ev => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy)
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  // data-om-starter: inert presence marker — Claude Design's starter-usage
  // probe reads it. The closed panel renders nothing, so the marker rides
  // the <html> element as an attribute instead of a rendered node — zero
  // elements added, so page CSS (even structural selectors like
  // :nth-child) can never observe it. It records that the page WIRES a
  // tweaks panel, whether or not the panel is open. Keep this effect.
  React.useEffect(() => {
    document.documentElement.setAttribute('data-om-starter', 'tweaks-panel');
    return () => document.documentElement.removeAttribute('data-om-starter');
  }, []);
  if (!open) return null;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, __TWEAKS_STYLE), /*#__PURE__*/React.createElement("div", {
    ref: dragRef,
    className: "twk-panel",
    "data-omelette-chrome": "",
    style: {
      right: offsetRef.current.x,
      bottom: offsetRef.current.y
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-hd",
    onMouseDown: onDragStart
  }, /*#__PURE__*/React.createElement("b", null, title), /*#__PURE__*/React.createElement("button", {
    className: "twk-x",
    "aria-label": "Close tweaks",
    onMouseDown: e => e.stopPropagation(),
    onClick: dismiss
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "twk-body"
  }, children)));
}

// ── Layout helpers ──────────────────────────────────────────────────────────

function TweakSection({
  label,
  children
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "twk-sect"
  }, label), children);
}
function TweakRow({
  label,
  value,
  children,
  inline = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: inline ? 'twk-row twk-row-h' : 'twk-row'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label), value != null && /*#__PURE__*/React.createElement("span", {
    className: "twk-val"
  }, value)), children);
}

// ── Controls ────────────────────────────────────────────────────────────────

function TweakSlider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label,
    value: `${value}${unit}`
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    className: "twk-slider",
    min: min,
    max: max,
    step: step,
    value: value,
    onChange: e => onChange(Number(e.target.value))
  }));
}
function TweakToggle({
  label,
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-row twk-row-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "twk-toggle",
    "data-on": value ? '1' : '0',
    role: "switch",
    "aria-checked": !!value,
    onClick: () => onChange(!value)
  }, /*#__PURE__*/React.createElement("i", null)));
}
function TweakRadio({
  label,
  value,
  options,
  onChange
}) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  // The active value is read by pointer-move handlers attached for the lifetime
  // of a drag — ref it so a stale closure doesn't fire onChange for every move.
  const valueRef = React.useRef(value);
  valueRef.current = value;

  // Segments wrap mid-word once per-segment width runs out. The track is
  // ~248px (280 panel − 28 body pad − 4 seg pad), each button loses 12px
  // to its own padding, and 11.5px system-ui averages ~6.3px/char — so 2
  // options fit ~16 chars each, 3 fit ~10. Past that (or >3 options), fall
  // back to a dropdown rather than wrap.
  const labelLen = o => String(typeof o === 'object' ? o.label : o).length;
  const maxLen = options.reduce((m, o) => Math.max(m, labelLen(o)), 0);
  const fitsAsSegments = maxLen <= ({
    2: 16,
    3: 10
  }[options.length] ?? 0);
  if (!fitsAsSegments) {
    // <select> emits strings — map back to the original option value so the
    // fallback stays type-preserving (numbers, booleans) like the segment path.
    const resolve = s => {
      const m = options.find(o => String(typeof o === 'object' ? o.value : o) === s);
      return m === undefined ? s : typeof m === 'object' ? m.value : m;
    };
    return /*#__PURE__*/React.createElement(TweakSelect, {
      label: label,
      value: value,
      options: options,
      onChange: s => onChange(resolve(s))
    });
  }
  const opts = options.map(o => typeof o === 'object' ? o : {
    value: o,
    label: o
  });
  const idx = Math.max(0, opts.findIndex(o => o.value === value));
  const n = opts.length;
  const segAt = clientX => {
    const r = trackRef.current.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor((clientX - r.left - 2) / inner * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };
  const onPointerDown = e => {
    setDragging(true);
    const v0 = segAt(e.clientX);
    if (v0 !== valueRef.current) onChange(v0);
    const move = ev => {
      if (!trackRef.current) return;
      const v = segAt(ev.clientX);
      if (v !== valueRef.current) onChange(v);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    ref: trackRef,
    role: "radiogroup",
    onPointerDown: onPointerDown,
    className: dragging ? 'twk-seg dragging' : 'twk-seg'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-seg-thumb",
    style: {
      left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
      width: `calc((100% - 4px) / ${n})`
    }
  }), opts.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.value,
    type: "button",
    role: "radio",
    "aria-checked": o.value === value
  }, o.label))));
}
function TweakSelect({
  label,
  value,
  options,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("select", {
    className: "twk-field",
    value: value,
    onChange: e => onChange(e.target.value)
  }, options.map(o => {
    const v = typeof o === 'object' ? o.value : o;
    const l = typeof o === 'object' ? o.label : o;
    return /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, l);
  })));
}
function TweakText({
  label,
  value,
  placeholder,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("input", {
    className: "twk-field",
    type: "text",
    value: value,
    placeholder: placeholder,
    onChange: e => onChange(e.target.value)
  }));
}
function TweakNumber({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange
}) {
  const clamp = n => {
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };
  const startRef = React.useRef({
    x: 0,
    val: 0
  });
  const onScrubStart = e => {
    e.preventDefault();
    startRef.current = {
      x: e.clientX,
      val: value
    };
    const decimals = (String(step).split('.')[1] || '').length;
    const move = ev => {
      const dx = ev.clientX - startRef.current.x;
      const raw = startRef.current.val + dx * step;
      const snapped = Math.round(raw / step) * step;
      onChange(clamp(Number(snapped.toFixed(decimals))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-num"
  }, /*#__PURE__*/React.createElement("span", {
    className: "twk-num-lbl",
    onPointerDown: onScrubStart
  }, label), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: value,
    min: min,
    max: max,
    step: step,
    onChange: e => onChange(clamp(Number(e.target.value)))
  }), unit && /*#__PURE__*/React.createElement("span", {
    className: "twk-num-unit"
  }, unit));
}

// Relative-luminance contrast pick — checkmarks drawn over a swatch need to
// read on both #111 and #fafafa without per-option configuration. Hex input
// only (#rgb / #rrggbb); named or rgb()/hsl() colors fall through to "light".
function __twkIsLight(hex) {
  const h = String(hex).replace('#', '');
  const x = h.length === 3 ? h.replace(/./g, c => c + c) : h.padEnd(6, '0');
  const n = parseInt(x.slice(0, 6), 16);
  if (Number.isNaN(n)) return true;
  const r = n >> 16 & 255,
    g = n >> 8 & 255,
    b = n & 255;
  return r * 299 + g * 587 + b * 114 > 148000;
}
const __TwkCheck = ({
  light
}) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 14 14",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("path", {
  d: "M3 7.2 5.8 10 11 4.2",
  fill: "none",
  strokeWidth: "2.2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  stroke: light ? 'rgba(0,0,0,.78)' : '#fff'
}));

// TweakColor — curated color/palette picker. Each option is either a single
// hex string or an array of 1-5 hex strings; the card adapts — a lone color
// renders solid, a palette renders colors[0] as the hero (left ~2/3) with the
// rest stacked in a sharp column on the right. onChange emits the
// option in the shape it was passed (string stays string, array stays array).
// Without options it falls back to the native color input for back-compat.
function TweakColor({
  label,
  value,
  options,
  onChange
}) {
  if (!options || !options.length) {
    return /*#__PURE__*/React.createElement("div", {
      className: "twk-row twk-row-h"
    }, /*#__PURE__*/React.createElement("div", {
      className: "twk-lbl"
    }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("input", {
      type: "color",
      className: "twk-swatch",
      value: value,
      onChange: e => onChange(e.target.value)
    }));
  }
  // Native <input type=color> emits lowercase hex per the HTML spec, so
  // compare case-insensitively. String() guards JSON.stringify(undefined),
  // which returns the primitive undefined (no .toLowerCase).
  const key = o => String(JSON.stringify(o)).toLowerCase();
  const cur = key(value);
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-chips",
    role: "radiogroup"
  }, options.map((o, i) => {
    const colors = Array.isArray(o) ? o : [o];
    const [hero, ...rest] = colors;
    const sup = rest.slice(0, 4);
    const on = key(o) === cur;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      type: "button",
      className: "twk-chip",
      role: "radio",
      "aria-checked": on,
      "data-on": on ? '1' : '0',
      "aria-label": colors.join(', '),
      title: colors.join(' · '),
      style: {
        background: hero
      },
      onClick: () => onChange(o)
    }, sup.length > 0 && /*#__PURE__*/React.createElement("span", null, sup.map((c, j) => /*#__PURE__*/React.createElement("i", {
      key: j,
      style: {
        background: c
      }
    }))), on && /*#__PURE__*/React.createElement(__TwkCheck, {
      light: __twkIsLight(hero)
    }));
  })));
}
function TweakButton({
  label,
  onClick,
  secondary = false
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: secondary ? 'twk-btn secondary' : 'twk-btn',
    onClick: onClick
  }, label);
}
Object.assign(window, {
  useTweaks,
  TweaksPanel,
  TweakSection,
  TweakRow,
  TweakSlider,
  TweakToggle,
  TweakRadio,
  TweakSelect,
  TweakText,
  TweakNumber,
  TweakColor,
  TweakButton
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/crm-v2/tweaks-panel.jsx", error: String((e && e.message) || e) }); }

// ui_kits/crm-v2/ui.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const A2Icon = ({
  name,
  size = 18,
  style
}) => /*#__PURE__*/React.createElement("span", {
  "aria-hidden": "true",
  style: {
    width: size,
    height: size,
    flexShrink: 0,
    display: 'inline-block',
    backgroundColor: 'currentColor',
    WebkitMask: `url(https://unpkg.com/lucide-static@0.428.0/icons/${name}.svg) center/contain no-repeat`,
    mask: `url(https://unpkg.com/lucide-static@0.428.0/icons/${name}.svg) center/contain no-repeat`,
    ...style
  }
});
function A2Btn({
  variant = '',
  icon,
  orb,
  size,
  count,
  children,
  className = '',
  ...rest
}) {
  const cls = ['a2-btn', variant, size, orb ? 'has-orb' : '', className].join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    className: cls
  }, rest), orb ? /*#__PURE__*/React.createElement("span", {
    className: "orb"
  }, /*#__PURE__*/React.createElement(A2Icon, {
    name: orb,
    size: 16
  })) : icon && /*#__PURE__*/React.createElement(A2Icon, {
    name: icon,
    size: 16
  }), children, count != null && /*#__PURE__*/React.createElement("span", {
    className: "count"
  }, count));
}
const A2IconBtn = ({
  icon,
  label,
  dot,
  plain,
  size = 18,
  ...rest
}) => /*#__PURE__*/React.createElement("button", _extends({
  className: 'a2-iconbtn' + (plain ? ' plain' : ''),
  "aria-label": label,
  title: label
}, rest), /*#__PURE__*/React.createElement(A2Icon, {
  name: icon,
  size: size
}), dot && /*#__PURE__*/React.createElement("span", {
  className: "dot"
}));
const A2Pill = ({
  tone = 'neutral',
  dot = true,
  children
}) => /*#__PURE__*/React.createElement("span", {
  className: 'a2-pill ' + tone
}, dot && /*#__PURE__*/React.createElement("i", null), children);
const A2Delta = ({
  v
}) => /*#__PURE__*/React.createElement("span", {
  className: 'a2-delta ' + (v >= 0 ? 'up' : 'down')
}, /*#__PURE__*/React.createElement(A2Icon, {
  name: v >= 0 ? 'arrow-up' : 'arrow-down',
  size: 11
}), Math.abs(v), "%");
function A2Seg({
  options,
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "a2-seg",
    role: "tablist"
  }, options.map(o => {
    const id = o.id ?? o;
    const lbl = o.label ?? o;
    return /*#__PURE__*/React.createElement("button", {
      key: id,
      role: "tab",
      "aria-selected": value === id,
      className: value === id ? 'on' : '',
      onClick: () => onChange(id)
    }, lbl, o.n != null && /*#__PURE__*/React.createElement("em", null, o.n));
  }));
}
const A2Check = ({
  on,
  onClick,
  label = 'Selecionar'
}) => /*#__PURE__*/React.createElement("button", {
  className: 'a2-check' + (on ? ' on' : ''),
  "aria-label": label,
  "aria-pressed": !!on,
  onClick: e => {
    e.stopPropagation();
    onClick && onClick();
  }
}, on && /*#__PURE__*/React.createElement(A2Icon, {
  name: "check",
  size: 13
}));
function A2Score({
  v
}) {
  const c = v >= 80 ? 'var(--a2-success)' : v >= 60 ? 'var(--a2-accent)' : 'var(--a2-danger)';
  return /*#__PURE__*/React.createElement("span", {
    className: "a2-score"
  }, /*#__PURE__*/React.createElement("span", {
    className: "track"
  }, /*#__PURE__*/React.createElement("i", {
    style: {
      width: v + '%',
      background: c
    }
  })), /*#__PURE__*/React.createElement("b", {
    className: "num",
    style: {
      fontSize: 12.5,
      fontWeight: 600,
      color: c,
      minWidth: 22,
      textAlign: 'right'
    }
  }, v));
}
const A2Empty = ({
  icon = 'construction',
  title,
  children
}) => /*#__PURE__*/React.createElement("div", {
  className: "a2-empty"
}, /*#__PURE__*/React.createElement("span", {
  className: "a2-ico",
  style: {
    width: 48,
    height: 48,
    borderRadius: 16
  }
}, /*#__PURE__*/React.createElement(A2Icon, {
  name: icon,
  size: 22
})), /*#__PURE__*/React.createElement("h3", null, title), /*#__PURE__*/React.createElement("p", null, children));
const A2Head = ({
  title,
  sub,
  children
}) => /*#__PURE__*/React.createElement("div", {
  className: "a2-head"
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, title), sub && /*#__PURE__*/React.createElement("p", null, sub)), /*#__PURE__*/React.createElement("div", {
  className: "a2-head-actions"
}, children));
const initials = s => s.replace(/^(Fazenda|Família|Grupo|Fundo)\s+/i, '').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
Object.assign(window, {
  A2Icon,
  A2Btn,
  A2IconBtn,
  A2Pill,
  A2Delta,
  A2Seg,
  A2Check,
  A2Score,
  A2Empty,
  A2Head,
  initials
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/crm-v2/ui.jsx", error: String((e && e.message) || e) }); }

// ui_kits/data.js
try { (() => {
// Shared demo data for the CRM v2 and site kits (pt-BR).
window.GV_DATA = {
  nav: [{
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'layout-dashboard'
  }, {
    section: 'Comercial'
  }, {
    id: 'fazendas',
    label: 'Fazendas',
    icon: 'tractor',
    badge: 128
  }, {
    id: 'compradores',
    label: 'Compradores',
    icon: 'users',
    badge: 342
  }, {
    id: 'oportunidades',
    label: 'Oportunidades',
    icon: 'handshake',
    badge: 47
  }, {
    id: 'pipeline',
    label: 'Pipeline',
    icon: 'kanban'
  }, {
    section: 'Operação'
  }, {
    id: 'diligence',
    label: 'Due diligence',
    icon: 'shield-check',
    badge: 7
  }, {
    id: 'agenda',
    label: 'Agenda',
    icon: 'calendar-clock',
    badge: 3
  }, {
    id: 'relatorios',
    label: 'Relatórios',
    icon: 'file-bar-chart'
  }, {
    section: 'Administração'
  }, {
    id: 'usuarios',
    label: 'Usuários e perfis',
    icon: 'user-cog'
  }, {
    id: 'auditoria',
    label: 'Logs de auditoria',
    icon: 'history'
  }],
  stages: ['Lead recebido', 'Qualificação', 'Levantamento de perfil', 'Apresentação de opções', 'Visita técnica', 'Pré-negociação', 'Due diligence', 'Estruturação contratual', 'Fechamento', 'Pós-venda'],
  fazendas: [{
    id: 'F-118',
    nome: 'Fazenda Três Barras',
    mun: 'Jaborandi, BA',
    regiao: 'Oeste da Bahia',
    area: '1.480',
    util: '1.120',
    ha: '62.000',
    sacas: '1.240',
    status: 'Disponível',
    tone: 'success',
    apt: 'Lavoura',
    corretor: 'Milson',
    prior: 'Alta',
    agua: 'Rio perene + 2 açudes',
    irrig: 'Alto',
    rodovia: '12 km',
    armazem: '18 km',
    doc: 'Regular'
  }, {
    id: 'F-102',
    nome: 'Fazenda Santa Rita',
    mun: 'Uberaba, MG',
    regiao: 'Alto Paranaíba',
    area: '820',
    util: '690',
    ha: '88.500',
    sacas: '1.770',
    status: 'Em negociação',
    tone: 'info',
    apt: 'Mista',
    corretor: 'Renata C.',
    prior: 'Alta',
    agua: 'Poços artesianos',
    irrig: 'Médio',
    rodovia: '4 km',
    armazem: '9 km',
    doc: 'Regular'
  }, {
    id: 'F-131',
    nome: 'Fazenda Boa Esperança',
    mun: 'Bom Jesus, PI',
    regiao: 'Sul do Piauí',
    area: '2.140',
    util: '1.680',
    ha: '41.200',
    sacas: '824',
    status: 'Doc. pendente',
    tone: 'warning',
    apt: 'Lavoura',
    corretor: 'Milson',
    prior: 'Média',
    agua: 'Riacho intermitente',
    irrig: 'Baixo',
    rodovia: '31 km',
    armazem: '44 km',
    doc: 'Em regularização'
  }, {
    id: 'F-097',
    nome: 'Fazenda Vale do Cedro',
    mun: 'Sorriso, MT',
    regiao: 'Médio-Norte MT',
    area: '3.260',
    util: '2.980',
    ha: '115.000',
    sacas: '2.300',
    status: 'Disponível',
    tone: 'success',
    apt: 'Lavoura',
    corretor: 'Diego A.',
    prior: 'Alta',
    agua: '2 rios perenes',
    irrig: 'Alto',
    rodovia: '8 km',
    armazem: '6 km',
    doc: 'Regular'
  }, {
    id: 'F-076',
    nome: 'Fazenda Serra Azul',
    mun: 'Chapadão do Sul, MS',
    regiao: 'Bolsão MS',
    area: '640',
    util: '520',
    ha: '96.400',
    sacas: '1.930',
    status: 'Reservada',
    tone: 'neutral',
    apt: 'Pecuária',
    corretor: 'Renata C.',
    prior: 'Baixa',
    agua: 'Nascentes',
    irrig: 'Médio',
    rodovia: '15 km',
    armazem: '22 km',
    doc: 'Regular'
  }, {
    id: 'F-142',
    nome: 'Fazenda Nova Aliança',
    mun: 'Formosa do Rio Preto, BA',
    regiao: 'Oeste da Bahia',
    area: '1.910',
    util: '1.540',
    ha: '58.700',
    sacas: '1.174',
    status: 'Disponível',
    tone: 'success',
    apt: 'Mista',
    corretor: 'Diego A.',
    prior: 'Média',
    agua: 'Açude + poço',
    irrig: 'Médio',
    rodovia: '22 km',
    armazem: '27 km',
    doc: 'Regular'
  }],
  compradores: [{
    nome: 'Agro Holding Bertoldi',
    tipo: 'PJ',
    ticket: 'R$ 25 mi',
    regioes: ['Oeste da Bahia', 'Sul do Piauí'],
    culturas: ['Soja', 'Milho'],
    hectares: '1.000 – 2.500 ha',
    urgencia: 'Alta',
    qualificacao: 'Quente',
    score: 92
  }, {
    nome: 'Família Nakamura',
    tipo: 'PF',
    ticket: 'R$ 12 mi',
    regioes: ['Alto Paranaíba'],
    culturas: ['Café', 'Milho'],
    hectares: '400 – 900 ha',
    urgencia: 'Média',
    qualificacao: 'Morno',
    score: 74
  }, {
    nome: 'Fundo Terra Firme',
    tipo: 'PJ',
    ticket: 'R$ 60 mi',
    regioes: ['Médio-Norte MT', 'Bolsão MS'],
    culturas: ['Soja', 'Algodão'],
    hectares: '2.000 – 5.000 ha',
    urgencia: 'Baixa',
    qualificacao: 'Frio',
    score: 58
  }, {
    nome: 'Pecuária São Judas',
    tipo: 'PJ',
    ticket: 'R$ 9 mi',
    regioes: ['Bolsão MS'],
    culturas: ['Pecuária'],
    hectares: '300 – 800 ha',
    urgencia: 'Alta',
    qualificacao: 'Quente',
    score: 41
  }],
  pipeline: [{
    stage: 'Lead recebido',
    pct: 9,
    index: 1,
    total: 'R$ 14,2 mi',
    deals: [{
      client: 'Pecuária São Judas',
      farm: 'Fazenda Serra Azul',
      value: 'R$ 6,1 mi',
      probability: 15,
      owner: 'RC',
      nextAction: 'Primeiro contato · hoje'
    }, {
      client: 'Investidor — indicação Milson',
      farm: 'Sem fazenda associada',
      value: 'R$ 8,1 mi',
      probability: 10,
      owner: 'MS',
      nextAction: 'Qualificar · 26/07'
    }]
  }, {
    stage: 'Qualificação',
    pct: 14,
    index: 2,
    total: 'R$ 21,5 mi',
    deals: [{
      client: 'Família Nakamura',
      farm: 'Fazenda Santa Rita',
      value: 'R$ 11,0 mi',
      probability: 30,
      owner: 'RC',
      nextAction: 'Levantar perfil · 27/07'
    }, {
      client: 'Grupo Vilela',
      farm: '2 fazendas',
      value: 'R$ 10,5 mi',
      probability: 25,
      owner: 'DA',
      nextAction: 'Retorno atrasado · 09/07',
      overdue: true
    }]
  }, {
    stage: 'Apresentação de opções',
    pct: 22,
    index: 4,
    total: 'R$ 33,8 mi',
    deals: [{
      client: 'Fundo Terra Firme',
      farm: '3 fazendas',
      value: 'R$ 33,8 mi',
      probability: 45,
      owner: 'DA',
      nextAction: 'Enviar dossiê · 25/07'
    }]
  }, {
    stage: 'Visita técnica',
    pct: 12,
    index: 5,
    total: 'R$ 18,4 mi',
    deals: [{
      client: 'Agro Holding Bertoldi',
      farm: 'Fazenda Três Barras',
      value: 'R$ 18,4 mi',
      probability: 70,
      owner: 'MS',
      nextAction: 'Visita · 28/07'
    }]
  }, {
    stage: 'Due diligence',
    pct: 27,
    index: 7,
    total: 'R$ 42,1 mi',
    deals: [{
      client: 'Cooperativa Alto Vale',
      farm: 'Fazenda Vale do Cedro',
      value: 'R$ 34,7 mi',
      probability: 80,
      owner: 'DA',
      nextAction: 'Laudo ambiental · 30/07'
    }, {
      client: 'Bertoldi Participações',
      farm: 'Fazenda Nova Aliança',
      value: 'R$ 7,4 mi',
      probability: 65,
      owner: 'MS',
      nextAction: 'Sem atividade há 18 dias',
      overdue: true
    }]
  }, {
    stage: 'Fechamento',
    pct: 17,
    index: 9,
    total: 'R$ 26,9 mi',
    deals: [{
      client: 'Grupo Nakamura Agro',
      farm: 'Fazenda Santa Rita',
      value: 'R$ 26,9 mi',
      probability: 90,
      owner: 'RC',
      nextAction: 'Assinatura · 31/07'
    }]
  }],
  atividades: [{
    kind: 'visita',
    title: 'Visita técnica à Fazenda Três Barras',
    date: '24/07 · 09h00',
    detail: 'Comprador acompanhou a colheita e solicitou laudo de solo atualizado.',
    author: 'Milson'
  }, {
    kind: 'mensagem',
    title: 'Oportunidade enviada por WhatsApp',
    date: '21/07 · 18h20',
    detail: 'Fazenda Nova Aliança enviada a 4 compradores compatíveis.',
    author: 'Sistema'
  }, {
    kind: 'ligacao',
    title: 'Retorno ao Fundo Terra Firme',
    date: '19/07 · 16h10',
    detail: 'Fundo pediu comparativo de valor por hectare útil entre MT e BA.',
    author: 'Diego A.'
  }, {
    kind: 'nota',
    title: 'Proprietário aceita negociar prazo',
    date: '17/07 · 11h05',
    detail: 'Até 30% em sacas de soja, safra 26/27.',
    author: 'Milson'
  }],
  diligence: [{
    state: 'ok',
    label: 'Matrícula atualizada',
    meta: 'Anexada em 12/03 · Cartório de Barreiras',
    badge: 'Concluído'
  }, {
    state: 'ok',
    label: 'CAR e CCIR',
    meta: 'Validados em 02/04',
    badge: 'Concluído'
  }, {
    state: 'pending',
    label: 'Licença ambiental',
    meta: 'Aguardando órgão estadual desde 28/06',
    badge: 'Em análise'
  }, {
    state: 'blocked',
    label: 'Georreferenciamento',
    meta: 'Divergência de 4,2 ha na divisa norte',
    badge: 'Pendência'
  }, {
    state: 'empty',
    label: 'Certidões fiscais',
    meta: 'Não iniciado'
  }],
  documentos: [{
    cat: 'Matrículas',
    qtd: 4,
    atualizado: '12/03/2026'
  }, {
    cat: 'CAR / CCIR',
    qtd: 2,
    atualizado: '02/04/2026'
  }, {
    cat: 'Georreferenciamento',
    qtd: 3,
    atualizado: '19/05/2026'
  }, {
    cat: 'Mapas',
    qtd: 5,
    atualizado: '19/05/2026'
  }, {
    cat: 'Laudos',
    qtd: 2,
    atualizado: '01/07/2026'
  }, {
    cat: 'Contratos',
    qtd: 1,
    atualizado: '11/07/2026'
  }],
  regioes: [{
    nome: 'Oeste da Bahia',
    buscas: 38,
    pct: 100
  }, {
    nome: 'Médio-Norte MT',
    buscas: 31,
    pct: 82
  }, {
    nome: 'Alto Paranaíba',
    buscas: 24,
    pct: 63
  }, {
    nome: 'Sul do Piauí',
    buscas: 17,
    pct: 45
  }, {
    nome: 'Bolsão MS',
    buscas: 11,
    pct: 29
  }]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/data.js", error: String((e && e.message) || e) }); }

// ui_kits/site/HomeScreen.jsx
try { (() => {
(function () {
  const {
    Button,
    Select,
    FarmCard,
    Card,
    Icon
  } = window.GrandVistaDesignSystem_6745fe;
  function HomeScreen({
    onOpenProperty,
    onSearch
  }) {
    const d = window.GV_DATA;
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("section", {
      style: {
        position: 'relative',
        minHeight: 520,
        display: 'flex',
        alignItems: 'flex-end',
        background: 'center/cover no-repeat url(../../assets/logo-fachada-grandvista.jpeg)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--scrim-bottom)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        width: '100%',
        maxWidth: 1240,
        margin: '0 auto',
        padding: 'var(--space-13) var(--space-10) var(--space-10)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "gv-eyebrow",
      style: {
        color: 'var(--gv-gold-300)'
      }
    }, "Fazendas de alto valor \xB7 9 regi\xF5es"), /*#__PURE__*/React.createElement("h1", {
      style: {
        maxWidth: 720,
        marginTop: 'var(--space-6)',
        fontSize: 'var(--size-hero)',
        fontWeight: 'var(--weight-light)',
        lineHeight: 1.08,
        color: 'var(--gv-sand-100)',
        textWrap: 'pretty'
      }
    }, "A fazenda certa raramente est\xE1 anunciada."), /*#__PURE__*/React.createElement("p", {
      style: {
        maxWidth: 560,
        marginTop: 'var(--space-6)',
        font: 'var(--weight-regular) var(--size-lg)/1.6 var(--font-sans)',
        color: 'rgba(243,231,206,.82)'
      }
    }, "Trabalhamos com carteira pr\xF3pria, an\xE1lise t\xE9cnica das propriedades e leitura do perfil de cada investidor antes de apresentar qualquer op\xE7\xE3o."))), /*#__PURE__*/React.createElement("section", {
      style: {
        position: 'relative',
        maxWidth: 1240,
        margin: '-40px auto 0',
        padding: '0 var(--space-10)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'flex-end',
        gap: 'var(--space-6)',
        padding: 'var(--space-8)',
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderTop: '2px solid var(--brand-accent)',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-lg)'
      }
    }, [['Região', ['Oeste da Bahia', 'Médio-Norte MT', 'Alto Paranaíba', 'Sul do Piauí', 'Bolsão MS']], ['Aptidão', ['Lavoura', 'Pecuária', 'Mista']], ['Área útil', ['Até 500 ha', '500 – 1.500 ha', '1.500 – 3.000 ha', 'Acima de 3.000 ha']], ['Faixa de valor', ['Até R$ 20 mi', 'R$ 20 – 50 mi', 'Acima de R$ 50 mi']]].map(([label, opts]) => /*#__PURE__*/React.createElement("label", {
      key: label,
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "gv-eyebrow"
    }, label), /*#__PURE__*/React.createElement(Select, {
      placeholder: "Indiferente",
      options: opts
    }))), /*#__PURE__*/React.createElement(Button, {
      size: "lg",
      icon: "search",
      onClick: onSearch
    }, "Buscar fazendas"))), /*#__PURE__*/React.createElement("section", {
      style: {
        maxWidth: 1240,
        margin: '0 auto',
        padding: 'var(--space-12) var(--space-10) 0'
      }
    }, /*#__PURE__*/React.createElement(window.SectionHead, {
      eyebrow: "Sele\xE7\xE3o da semana",
      title: "Propriedades em destaque",
      description: "Cada ficha traz \xE1rea \xFAtil, valor por hectare, disponibilidade h\xEDdrica e situa\xE7\xE3o documental verificada pela nossa equipe.",
      action: /*#__PURE__*/React.createElement(Button, {
        variant: "secondary",
        iconRight: "arrow-right",
        onClick: onSearch
      }, "Ver todas as fazendas")
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3,1fr)',
        gap: 'var(--space-7)'
      }
    }, d.fazendas.slice(0, 3).map(f => /*#__PURE__*/React.createElement(FarmCard, {
      key: f.id,
      onClick: () => onOpenProperty(f),
      name: f.nome,
      location: f.mun + ' · ' + f.regiao,
      price: 'R$ ' + f.ha,
      priceUnit: "por hectare \xFAtil",
      area: f.area + ' ha · ' + f.util + ' úteis',
      status: f.status,
      statusTone: f.tone,
      featured: f.prior === 'Alta',
      specs: [{
        icon: 'droplets',
        value: 'Irrigação ' + f.irrig.toLowerCase()
      }, {
        icon: 'wheat',
        value: f.apt
      }]
    })))), /*#__PURE__*/React.createElement("section", {
      style: {
        maxWidth: 1240,
        margin: '0 auto',
        padding: 'var(--space-12) var(--space-10) 0'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--space-10)',
        alignItems: 'center',
        padding: 'var(--space-10)',
        background: 'var(--surface-sunken)',
        borderRadius: 'var(--radius-lg)'
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "gv-eyebrow",
      style: {
        marginBottom: 8
      }
    }, "Como trabalhamos"), /*#__PURE__*/React.createElement("h2", {
      style: {
        fontSize: 'var(--size-h1)',
        fontWeight: 'var(--weight-light)',
        lineHeight: 1.15
      }
    }, "Negocia\xE7\xE3o consultiva, do perfil ao p\xF3s-venda"), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: '14px 0 0',
        font: 'var(--weight-regular) var(--size-body)/1.65 var(--font-sans)',
        color: 'var(--text-body)'
      }
    }, "Antes de apresentar op\xE7\xF5es, entendemos capacidade de investimento, culturas de interesse, faixa de hectares e urg\xEAncia. Depois acompanhamos a due diligence jur\xEDdica, ambiental e fundi\xE1ria at\xE9 a assinatura."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 'var(--space-5)',
        marginTop: 'var(--space-8)'
      }
    }, /*#__PURE__*/React.createElement(Button, {
      icon: "calendar-clock"
    }, "Agendar conversa"), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      icon: "file-text"
    }, "Anunciar minha fazenda"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--space-6)'
      }
    }, [['Perfil do investidor', 'Ticket, região, cultura e prazo.', 'user-search'], ['Curadoria', 'Só o que atende ao perfil.', 'filter'], ['Visita técnica', 'Solo, água, logística e sede.', 'map-pin'], ['Due diligence', 'Jurídico, ambiental e fundiário.', 'shield-check']].map(([t, s, ic]) => /*#__PURE__*/React.createElement("div", {
      key: t,
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: 'var(--space-6)',
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: ic,
      size: 19,
      style: {
        color: 'var(--gv-gold-600)'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        font: 'var(--weight-medium) var(--size-sm) var(--font-sans)',
        color: 'var(--text-heading)'
      }
    }, t), /*#__PURE__*/React.createElement("span", {
      style: {
        font: 'var(--weight-regular) var(--size-xs)/1.5 var(--font-sans)',
        color: 'var(--text-muted)'
      }
    }, s)))))), /*#__PURE__*/React.createElement("section", {
      style: {
        maxWidth: 1240,
        margin: '0 auto',
        padding: 'var(--space-12) var(--space-10) var(--space-13)'
      }
    }, /*#__PURE__*/React.createElement(window.SectionHead, {
      eyebrow: "Onde atuamos",
      title: "Regi\xF5es com demanda ativa"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(5,1fr)',
        gap: 'var(--space-6)'
      }
    }, d.regioes.map(r => /*#__PURE__*/React.createElement(Card, {
      key: r.nome,
      interactive: true,
      padding: "var(--space-7)"
    }, /*#__PURE__*/React.createElement("div", {
      className: "gv-num",
      style: {
        fontSize: 'var(--size-h2)',
        color: 'var(--gv-green-700)',
        fontWeight: 'var(--weight-medium)'
      }
    }, r.buscas), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 4,
        font: 'var(--weight-medium) var(--size-sm) var(--font-sans)',
        color: 'var(--text-heading)'
      }
    }, r.nome), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 2,
        font: 'var(--weight-regular) var(--size-xs) var(--font-sans)',
        color: 'var(--text-faint)'
      }
    }, "investidores buscando"))))));
  }
  Object.assign(window, {
    HomeScreen
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site/HomeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site/ListingScreen.jsx
try { (() => {
(function () {
  const {
    FarmCard,
    Select,
    Input,
    Button,
    Tag,
    Checkbox,
    Card,
    EmptyState
  } = window.GrandVistaDesignSystem_6745fe;
  function ListingScreen({
    onOpenProperty
  }) {
    const d = window.GV_DATA;
    const [q, setQ] = React.useState('');
    const [regioes, setRegioes] = React.useState([]);
    const all = [...new Set(d.fazendas.map(f => f.regiao))];
    const toggle = r => setRegioes(s => s.includes(r) ? s.filter(x => x !== r) : [...s, r]);
    const rows = d.fazendas.filter(f => (!q || (f.nome + f.mun).toLowerCase().includes(q.toLowerCase())) && (regioes.length === 0 || regioes.includes(f.regiao)));
    return /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 1240,
        margin: '0 auto',
        padding: 'var(--space-10) var(--space-10) var(--space-13)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "gv-eyebrow",
      style: {
        marginBottom: 8
      }
    }, "In\xEDcio \xB7 Fazendas"), /*#__PURE__*/React.createElement("h1", {
      style: {
        fontSize: 'var(--size-display)',
        fontWeight: 'var(--weight-light)',
        letterSpacing: 'var(--tracking-tight)'
      }
    }, "Fazendas dispon\xEDveis"), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: '10px 0 var(--space-9)',
        maxWidth: 620,
        font: 'var(--weight-regular) var(--size-body)/1.65 var(--font-sans)',
        color: 'var(--text-muted)'
      }
    }, d.fazendas.length, " propriedades em carteira. Valores por hectare \xFAtil, sujeitos a confirma\xE7\xE3o em visita t\xE9cnica."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '268px minmax(0,1fr)',
        gap: 'var(--space-9)',
        alignItems: 'start'
      }
    }, /*#__PURE__*/React.createElement("aside", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-8)',
        padding: 'var(--space-8)',
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-card)',
        position: 'sticky',
        top: 100
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "gv-eyebrow",
      style: {
        marginBottom: 10
      }
    }, "Busca"), /*#__PURE__*/React.createElement(Input, {
      icon: "search",
      placeholder: "Fazenda ou munic\xEDpio",
      value: q,
      onChange: e => setQ(e.target.value)
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "gv-eyebrow",
      style: {
        marginBottom: 10
      }
    }, "Regi\xE3o"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-5)'
      }
    }, all.map(r => /*#__PURE__*/React.createElement(Checkbox, {
      key: r,
      label: r,
      checked: regioes.includes(r),
      onChange: () => toggle(r)
    })))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "gv-eyebrow",
      style: {
        marginBottom: 10
      }
    }, "Aptid\xE3o"), /*#__PURE__*/React.createElement(Select, {
      placeholder: "Indiferente",
      options: ['Lavoura', 'Pecuária', 'Mista']
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "gv-eyebrow",
      style: {
        marginBottom: 10
      }
    }, "\xC1rea \xFAtil"), /*#__PURE__*/React.createElement(Select, {
      placeholder: "Indiferente",
      options: ['Até 500 ha', '500 – 1.500 ha', '1.500 – 3.000 ha', 'Acima de 3.000 ha']
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "gv-eyebrow",
      style: {
        marginBottom: 10
      }
    }, "Infraestrutura"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-5)'
      }
    }, /*#__PURE__*/React.createElement(Checkbox, {
      label: "Potencial de irriga\xE7\xE3o"
    }), /*#__PURE__*/React.createElement(Checkbox, {
      label: "Armaz\xE9m pr\xF3prio"
    }), /*#__PURE__*/React.createElement(Checkbox, {
      label: "Documenta\xE7\xE3o regular"
    }))), /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "sm",
      icon: "rotate-ccw",
      onClick: () => {
        setQ('');
        setRegioes([]);
      }
    }, "Limpar filtros")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-7)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-5)',
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        font: 'var(--weight-regular) var(--size-sm) var(--font-sans)',
        color: 'var(--text-muted)'
      }
    }, rows.length, " resultados"), regioes.map(r => /*#__PURE__*/React.createElement(Tag, {
      key: r,
      selected: true,
      icon: "map-pin",
      onRemove: () => toggle(r)
    }, r)), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 200,
        marginLeft: 'auto'
      }
    }, /*#__PURE__*/React.createElement(Select, {
      options: ['Mais recentes', 'Menor R$ / ha', 'Maior área útil']
    }))), rows.length === 0 ? /*#__PURE__*/React.createElement(Card, {
      padding: "0"
    }, /*#__PURE__*/React.createElement(EmptyState, {
      icon: "search-x",
      title: "Nenhuma fazenda com esses filtros",
      description: "Amplie a regi\xE3o ou fale com um corretor: parte da carteira n\xE3o \xE9 publicada.",
      action: /*#__PURE__*/React.createElement(Button, {
        variant: "accent",
        icon: "message-circle"
      }, "Falar com corretor")
    })) : /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2,1fr)',
        gap: 'var(--space-7)'
      }
    }, rows.map(f => /*#__PURE__*/React.createElement(FarmCard, {
      key: f.id,
      onClick: () => onOpenProperty(f),
      name: f.nome,
      location: f.mun + ' · ' + f.regiao,
      price: 'R$ ' + f.ha,
      priceUnit: "por hectare \xFAtil",
      area: f.area + ' ha · ' + f.util + ' úteis',
      status: f.status,
      statusTone: f.tone,
      featured: f.prior === 'Alta',
      specs: [{
        icon: 'droplets',
        value: 'Irrigação ' + f.irrig.toLowerCase()
      }, {
        icon: 'wheat',
        value: f.apt
      }, {
        icon: 'truck',
        value: f.armazem + ' do armazém'
      }]
    }))))));
  }
  Object.assign(window, {
    ListingScreen
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site/ListingScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site/PropertyScreen.jsx
try { (() => {
(function () {
  const {
    Button,
    Badge,
    Tag,
    Card,
    SpecList,
    Icon,
    Field,
    Input,
    Textarea,
    Checkbox,
    FarmCard,
    Tabs
  } = window.GrandVistaDesignSystem_6745fe;
  function PropertyScreen({
    farm,
    onOpenProperty,
    onSubmit
  }) {
    const d = window.GV_DATA;
    const f = farm || d.fazendas[0];
    const [tab, setTab] = React.useState('ficha');
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("section", {
      style: {
        position: 'relative',
        height: 420,
        background: 'var(--gv-sand-300)',
        display: 'grid',
        placeItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "gv-eyebrow",
      style: {
        color: 'var(--gv-sand-700)'
      }
    }, "Galeria da propriedade \xB7 12 fotos \xB7 2 v\xEDdeos"), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--scrim-flat)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 1240,
        margin: '0 auto',
        padding: '0 var(--space-10) var(--space-9)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement(Badge, {
      tone: f.tone,
      dot: true
    }, f.status), /*#__PURE__*/React.createElement(Badge, {
      tone: "gold"
    }, f.regiao)), /*#__PURE__*/React.createElement("h1", {
      style: {
        fontSize: 'var(--size-display)',
        fontWeight: 'var(--weight-light)',
        color: 'var(--gv-sand-100)',
        lineHeight: 1.1
      }
    }, f.nome), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        marginTop: 6,
        font: 'var(--weight-regular) var(--size-body) var(--font-sans)',
        color: 'rgba(243,231,206,.8)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "map-pin",
      size: 15
    }), f.mun)))), /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 1240,
        margin: '0 auto',
        padding: 'var(--space-10) var(--space-10) var(--space-13)',
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) 348px',
        gap: 'var(--space-10)',
        alignItems: 'start'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-9)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4,1fr)',
        gap: 'var(--space-6)'
      }
    }, [['Área total', f.area + ' ha'], ['Área útil', f.util + ' ha'], ['Valor por hectare útil', 'R$ ' + f.ha], ['Valor em sacas', f.sacas + ' sc/ha']].map(([l, v]) => /*#__PURE__*/React.createElement("div", {
      key: l,
      style: {
        padding: 'var(--space-6)',
        background: 'var(--surface-sunken)',
        borderRadius: 'var(--radius-md)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "gv-eyebrow"
    }, l), /*#__PURE__*/React.createElement("div", {
      className: "gv-num",
      style: {
        marginTop: 4,
        fontSize: 'var(--size-h3)',
        fontWeight: 'var(--weight-medium)',
        color: 'var(--gv-green-700)'
      }
    }, v)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Tabs, {
      active: tab,
      onSelect: setTab,
      items: [{
        id: 'ficha',
        label: 'Ficha técnica'
      }, {
        id: 'infra',
        label: 'Infraestrutura'
      }, {
        id: 'doc',
        label: 'Documentação'
      }],
      style: {
        marginBottom: 'var(--space-8)'
      }
    }), tab === 'ficha' && /*#__PURE__*/React.createElement(SpecList, {
      columns: 3,
      items: [{
        label: 'Aptidão',
        value: f.apt
      }, {
        label: 'Solo',
        value: 'Latossolo vermelho'
      }, {
        label: 'Topografia',
        value: 'Plano a suave-ondulado'
      }, {
        label: 'Disponibilidade hídrica',
        value: f.agua
      }, {
        label: 'Potencial de irrigação',
        value: f.irrig
      }, {
        label: 'Produtividade histórica',
        value: '68 sc/ha',
        mono: true
      }, {
        label: 'Distância de rodovias',
        value: f.rodovia,
        mono: true
      }, {
        label: 'Distância de armazéns',
        value: f.armazem,
        mono: true
      }, {
        label: 'Região',
        value: f.regiao
      }]
    }), tab === 'infra' && /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8
      }
    }, ['Sede reformada', '2 barracões', 'Energia trifásica', 'Curral', 'Poço artesiano', 'Acesso asfaltado'].map(t => /*#__PURE__*/React.createElement(Tag, {
      key: t,
      icon: "check"
    }, t))), tab === 'doc' && /*#__PURE__*/React.createElement(SpecList, {
      columns: 2,
      items: [{
        label: 'Situação documental',
        value: f.doc
      }, {
        label: 'Matrícula',
        value: 'Única, sem ônus'
      }, {
        label: 'CAR',
        value: 'Ativo'
      }, {
        label: 'Georreferenciamento',
        value: 'Concluído'
      }, {
        label: 'Reserva legal',
        value: 'Averbada'
      }, {
        label: 'Passivo ambiental',
        value: 'Não identificado'
      }]
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "gv-eyebrow",
      style: {
        marginBottom: 8
      }
    }, "Sobre a propriedade"), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        maxWidth: 680,
        font: 'var(--weight-regular) var(--size-body)/1.7 var(--font-sans)',
        color: 'var(--text-body)'
      }
    }, "\xC1rea consolidada de gr\xE3os com talh\xF5es abertos, hist\xF3rico de produtividade acima da m\xE9dia regional e log\xEDstica curta at\xE9 o armaz\xE9m. A propriedade admite negocia\xE7\xE3o com parte do pagamento em sacas de soja.")), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 260,
        borderRadius: 'var(--radius-card)',
        background: 'var(--gv-sand-200)',
        display: 'grid',
        placeItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "gv-eyebrow",
      style: {
        color: 'var(--gv-sand-700)'
      }
    }, "Mapa aproximado da regi\xE3o"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
        position: 'sticky',
        top: 100
      }
    }, /*#__PURE__*/React.createElement(Card, {
      accent: true,
      eyebrow: "Faixa de valor",
      title: 'R$ ' + f.ha + ' / ha útil'
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)'
      }
    }, /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        font: 'var(--weight-regular) var(--size-sm)/1.6 var(--font-sans)',
        color: 'var(--text-muted)'
      }
    }, "Fale com o corretor respons\xE1vel para receber a ficha completa, laudos e o hist\xF3rico de safras."), /*#__PURE__*/React.createElement(Field, {
      label: "Nome"
    }, /*#__PURE__*/React.createElement(Input, {
      placeholder: "Seu nome"
    })), /*#__PURE__*/React.createElement(Field, {
      label: "WhatsApp"
    }, /*#__PURE__*/React.createElement(Input, {
      placeholder: "(00) 00000-0000",
      inputMode: "tel"
    })), /*#__PURE__*/React.createElement(Field, {
      label: "Mensagem",
      hint: "Opcional"
    }, /*#__PURE__*/React.createElement(Textarea, {
      rows: 3,
      placeholder: "Tenho interesse nesta fazenda."
    })), /*#__PURE__*/React.createElement(Checkbox, {
      label: "Quero receber oportunidades semelhantes"
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "accent",
      block: true,
      icon: "message-circle",
      onClick: onSubmit
    }, "Falar com o corretor"), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        font: 'var(--weight-regular) var(--size-micro) var(--font-sans)',
        color: 'var(--text-faint)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "shield-check",
      size: 13
    }), "Seus dados n\xE3o s\xE3o compartilhados."))), /*#__PURE__*/React.createElement(Card, {
      title: "Corretor respons\xE1vel"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-6)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'grid',
        placeItems: 'center',
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: 'var(--gv-green-700)',
        color: 'var(--gv-gold-300)',
        font: 'var(--weight-medium) var(--size-lg) var(--font-display)'
      }
    }, "M"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        font: 'var(--weight-medium) var(--size-sm) var(--font-sans)',
        color: 'var(--text-heading)'
      }
    }, f.corretor), /*#__PURE__*/React.createElement("div", {
      style: {
        font: 'var(--weight-regular) var(--size-xs) var(--font-sans)',
        color: 'var(--text-muted)'
      }
    }, "Grand Vista Fazendas")))))), /*#__PURE__*/React.createElement("section", {
      style: {
        background: 'var(--surface-sunken)',
        padding: 'var(--space-12) 0'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 1240,
        margin: '0 auto',
        padding: '0 var(--space-10)'
      }
    }, /*#__PURE__*/React.createElement(window.SectionHead, {
      eyebrow: "Tamb\xE9m na mesma faixa",
      title: "Outras propriedades"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3,1fr)',
        gap: 'var(--space-7)'
      }
    }, d.fazendas.filter(x => x.id !== f.id).slice(0, 3).map(x => /*#__PURE__*/React.createElement(FarmCard, {
      key: x.id,
      onClick: () => onOpenProperty(x),
      name: x.nome,
      location: x.mun + ' · ' + x.regiao,
      price: 'R$ ' + x.ha,
      priceUnit: "por hectare \xFAtil",
      area: x.area + ' ha · ' + x.util + ' úteis',
      status: x.status,
      statusTone: x.tone,
      specs: [{
        icon: 'wheat',
        value: x.apt
      }]
    }))))));
  }
  Object.assign(window, {
    PropertyScreen
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site/PropertyScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site/SiteChrome.jsx
try { (() => {
(function () {
  const {
    Wordmark,
    Button,
    Icon
  } = window.GrandVistaDesignSystem_6745fe;
  function SiteHeader({
    page,
    onNavigate
  }) {
    const links = [['home', 'Início'], ['listagem', 'Fazendas'], ['regioes', 'Regiões'], ['sobre', 'A Grand Vista'], ['contato', 'Contato']];
    return /*#__PURE__*/React.createElement("header", {
      style: {
        position: 'sticky',
        top: 0,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-9)',
        height: 78,
        padding: '0 var(--space-10)',
        background: 'var(--gv-green-900)',
        borderBottom: '1px solid var(--border-inverse)'
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => onNavigate('home'),
      style: {
        background: 'none',
        border: 0,
        cursor: 'pointer',
        padding: 0
      }
    }, /*#__PURE__*/React.createElement(Wordmark, {
      size: 17,
      tone: "light"
    })), /*#__PURE__*/React.createElement("nav", {
      style: {
        display: 'flex',
        gap: 'var(--space-8)',
        marginLeft: 'var(--space-8)'
      }
    }, links.map(([id, label]) => /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: () => onNavigate(id),
      style: {
        background: 'none',
        border: 0,
        padding: '4px 0',
        cursor: 'pointer',
        borderBottom: '1px solid ' + (page === id ? 'var(--gv-gold-500)' : 'transparent'),
        color: page === id ? 'var(--gv-gold-300)' : 'var(--text-on-inverse)',
        font: 'var(--weight-regular) var(--size-sm)/1 var(--font-sans)'
      }
    }, label))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-6)',
        marginLeft: 'auto'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        color: 'var(--gv-sand-200)',
        font: 'var(--weight-regular) var(--size-sm) var(--font-sans)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "phone",
      size: 14,
      style: {
        color: 'var(--gv-gold-400)'
      }
    }), "(65) 0000-0000"), /*#__PURE__*/React.createElement(Button, {
      variant: "accent",
      size: "sm",
      icon: "message-circle"
    }, "Falar com corretor")));
  }
  function SiteFooter() {
    const cols = [['Fazendas', ['Lavoura', 'Pecuária', 'Mista', 'Áreas de expansão']], ['Regiões', ['Oeste da Bahia', 'Médio-Norte MT', 'Alto Paranaíba', 'Sul do Piauí', 'Bolsão MS']], ['Institucional', ['A Grand Vista', 'Como trabalhamos', 'Anuncie sua fazenda', 'Contato']]];
    return /*#__PURE__*/React.createElement("footer", {
      style: {
        background: 'var(--gv-green-900)',
        color: 'var(--text-on-inverse)',
        padding: 'var(--space-11) var(--space-10) var(--space-9)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1.2fr repeat(3,1fr)',
        gap: 'var(--space-10)',
        maxWidth: 1240,
        margin: '0 auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
        alignItems: 'flex-start'
      }
    }, /*#__PURE__*/React.createElement(Wordmark, {
      size: 19,
      tone: "light"
    }), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        maxWidth: 260,
        font: 'var(--weight-regular) var(--size-sm)/1.6 var(--font-sans)',
        color: 'rgba(243,231,206,.62)'
      }
    }, "Intermedia\xE7\xE3o de fazendas de alto valor. Curadoria t\xE9cnica, documenta\xE7\xE3o analisada e acompanhamento do primeiro contato ao p\xF3s-venda.")), cols.map(([t, items]) => /*#__PURE__*/React.createElement("div", {
      key: t,
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-5)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "gv-eyebrow",
      style: {
        color: 'var(--gv-gold-400)'
      }
    }, t), items.map(i => /*#__PURE__*/React.createElement("span", {
      key: i,
      style: {
        font: 'var(--weight-regular) var(--size-sm) var(--font-sans)',
        color: 'rgba(243,231,206,.72)'
      }
    }, i))))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 'var(--space-8)',
        maxWidth: 1240,
        margin: 'var(--space-10) auto 0',
        paddingTop: 'var(--space-6)',
        borderTop: '1px solid var(--border-inverse)',
        font: 'var(--weight-regular) var(--size-xs) var(--font-sans)',
        color: 'rgba(243,231,206,.45)'
      }
    }, /*#__PURE__*/React.createElement("span", null, "Grand Vista Fazendas Imobili\xE1ria \xB7 CRECI 00000-J"), /*#__PURE__*/React.createElement("span", null, "\xA9 2026 Grand Vista")));
  }
  function SectionHead({
    eyebrow,
    title,
    description,
    action
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 'var(--space-9)',
        marginBottom: 'var(--space-9)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 620
      }
    }, eyebrow && /*#__PURE__*/React.createElement("div", {
      className: "gv-eyebrow",
      style: {
        marginBottom: 8
      }
    }, eyebrow), /*#__PURE__*/React.createElement("h2", {
      style: {
        fontSize: 'var(--size-display)',
        fontWeight: 'var(--weight-light)',
        letterSpacing: 'var(--tracking-tight)',
        lineHeight: 1.12
      }
    }, title), description && /*#__PURE__*/React.createElement("p", {
      style: {
        margin: '12px 0 0',
        font: 'var(--weight-regular) var(--size-lg)/1.6 var(--font-sans)',
        color: 'var(--text-muted)'
      }
    }, description)), action);
  }
  Object.assign(window, {
    SiteHeader,
    SiteFooter,
    SectionHead
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site/SiteChrome.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Wordmark = __ds_scope.Wordmark;

__ds_ns.ActivityTimeline = __ds_scope.ActivityTimeline;

__ds_ns.ChecklistItem = __ds_scope.ChecklistItem;

__ds_ns.DataTable = __ds_scope.DataTable;

__ds_ns.DealCard = __ds_scope.DealCard;

__ds_ns.FarmCard = __ds_scope.FarmCard;

__ds_ns.MatchScore = __ds_scope.MatchScore;

__ds_ns.PipelineColumn = __ds_scope.PipelineColumn;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.SpecList = __ds_scope.SpecList;

__ds_ns.StatCard = __ds_scope.StatCard;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Field = __ds_scope.Field;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.SearchBar = __ds_scope.SearchBar;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.SidebarNav = __ds_scope.SidebarNav;

__ds_ns.StageStepper = __ds_scope.StageStepper;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.TopBar = __ds_scope.TopBar;

})();
