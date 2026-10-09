# CRM Rural v2 — admin responsivo

The reference CRM for the whole system (the Admin v2 standard). Brand palette green `#1F3A2C` / gold `#C49A4E`; the structure follows a soft-surface admin reference supplied by the client (floating white cards on a warm grey canvas, pill controls, very soft shadows).

Tokens: the core tokens in `tokens/` — `tokens/admin-v2.css` only provides short `--a2-*` aliases. Kit styles: `crm-v2.css`. Data: `../data.js` (shared with the site kit). The v1 CRM kit was removed when v2 became the standard.

## Principles (now system-wide)
- Canvas `#F2F1EC`, borderless white cards at 20px radius, two-layer soft shadow. Sidebar and topbar are floating cards.
- Pill buttons; primary carries an icon "orb". Active nav item is near-black green `#12241B`.
- One hero KPI per view (gradient green; tweakable to dark or gold).
- Geist + Geist Mono replace IBM Plex in this layer. Jost stays on the wordmark only.
- Status as soft pills with a dot; deltas as tiny up/down pills.

## Responsive (container queries on `.a2-frame`)
- **> 1180px** full sidebar 264px, topbar with metrics.
- **760–1180px** icon rail 76px, KPIs 2×2, side panels stack.
- **< 760px** mobile: compact header, floating bottom tab bar (Início, Fazendas, Pipeline, Compradores, Menu), tables become cards, kanban becomes stage selector + list, drawers become bottom sheets, FAB for "Cadastrar fazenda", bulk bar docks above the tab bar.

Desktop keeps every power feature: column picker, multi-select with floating bulk bar, inline row actions, prev/next in the detail drawer, ⌘K search.

## Tweaks
Tela (Auto / Tablet / Mobile frame), Densidade (Confortável / Compacta), Card destaque (Gradiente / Escuro / Dourado).
