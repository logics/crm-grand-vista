# Grand Vista Design System

Design system for **Grand Vista Fazendas Imobiliária** — a Brazilian brokerage specialising in high-value rural properties (fazendas). All product copy is Brazilian Portuguese.

## Context

Grand Vista intermediates farm sales: long, consultative cycles, investor relationships, technical property analysis, and matching each buyer's profile against a curated portfolio. The business is being digitised around two surfaces:

1. **CRM Rural sob medida** — the internal operating system: user roles and audit logs, cadastro técnico de fazendas (~30 fields plus custom ones), compradores e investidores, gestão de oportunidades, a 10-stage funil comercial, due diligence checklists (jurídico, ambiental, fundiário, fiscal, documental), agenda e follow-up, busca e matching interno, dashboard and reports, plus "Matching Inteligente" between property attributes and buyer profiles.
2. **Site de captação** — a public property site with relevant filters, defined conversion journeys and direct CRM integration (described in the scope's "Cenário identificado").

### Sources provided
- `uploads/Escopo CRM.md` — the commercial proposal / scope document (Grand Vista, responsável **Milson**, last revised 24 July 2026). Preserved at `guidelines/escopo-crm.md`. This is the only functional source of truth.
- `uploads/Logo-Demonstrativa-GrandVista.jpeg` — a photographic mock-up of the office signage. Preserved at `assets/logo-fachada-grandvista.jpeg`.
- `uploads/pasted-1787138166895-0.png` — a higher-resolution render of the brand plaque supplied by the client (1062×440). Preserved at `assets/logo-placa-grandvista.png`. Still raster, so it does not replace the missing vector.

**No codebase, Figma file, website or existing product UI was provided.** Everything visual here is derived from the signage photograph and the scope's vocabulary. The UI kits are therefore first interpretations, not recreations — see each kit's README.

## Brand mark

There is still **no vector logo** in the source material — only raster images. The best available is `assets/logo-placa-grandvista.png`, a 1062×440 render of the plaque, which shows the lockup clearly:

- One line: **GRAND** · circular monogram · **VISTA** — cream/beige letters, wide tracking, the geometric sans with a pointed-apex A.
- The monogram is a dark-green **M** overlapped by a gold **S**, inside a broken circular arc (gold on the right, green on the left), sitting above a small scene: a tree, grass tufts, a rail gate and a ground line.
- Below: **Fazendas** in title case, flanked left and right by horizontal rules.
- Below that, on its own rule: **IMOBILIÁRIA**, letter-spaced caps at the smallest size.
- The plaque ground is warm brown leather-tone with a thin inset border, not the sand wall of the first photo.

The mark has **not** been redrawn or reconstructed — the monogram in particular must not be approximated. Wherever a logo would go, the system uses the type-only `Wordmark` component (see `components/core/Wordmark.jsx`); use the raster plaque only at large sizes on a plain background. To place the real mark in UI, supply the vector file (SVG/AI/EPS).

---

## CONTENT FUNDAMENTALS

**Language.** Brazilian Portuguese, always. Technical rural vocabulary is used precisely and never simplified: *hectare útil*, *saca*, *aptidão*, *talhão*, *CAR*, *CCIR*, *matrícula*, *georreferenciamento*, *due diligence*, *ticket*, *funil*. English survives only where the market itself uses it (*due diligence*, *ticket*, *matching*, *pipeline*, *lead*).

**Person.** The company speaks as **nós** ("Trabalhamos com carteira própria", "Antes de apresentar opções, entendemos…"). The reader is addressed as **você** only in forms and CTAs ("Seu nome", "Fale com o corretor"). The CRM itself is impersonal: labels are nouns ("Valor em negociação", "Próxima atividade"), never "Your pipeline".

**Casing.** Sentence case everywhere — headings, buttons, table headers, badges. UPPERCASE is reserved for two things: the wordmark, and the mono label `.gv-eyebrow`. Never all-caps a sentence.

**Buttons and actions.** Verb-first, 1–3 words: "Cadastrar fazenda", "Enviar oportunidade", "Exportar", "Limpar filtros", "Falar com o corretor". No "Clique aqui", no exclamation marks.

**Tone.** Matter-of-fact and technical, with the restraint of a consultative broker. State facts and let the numbers do the selling. Marketing copy earns exactly one line of confidence per section:

> "A fazenda certa raramente está anunciada."
> "Trabalhamos com carteira própria, análise técnica das propriedades e leitura do perfil de cada investidor antes de apresentar qualquer opção."

Compare with the CRM register, which is flatter still:

> "Nenhuma fazenda compatível — ajuste a faixa de valor ou as regiões de interesse do comprador."
> "Sem atividade há 18 dias."

**Numbers.** pt-BR formatting: `R$ 62.000`, `1.480 ha`, `68 sc/ha`, `18%`, `24/07/2026`, `14h30`. Large money is abbreviated in dashboards (`R$ 48,2 mi`), written in full on records. Units live next to the value or in a field suffix, not in the label.

**Absence.** Missing data renders an em dash (`—`), never "N/A", never a guess. Modules without a design say so ("Módulo não desenhado"). This is a rule of the brand, not just of this file: the business sells verified information.

**Emoji: never.** Not in UI, not in marketing, not in notifications. Status is carried by a coloured dot, a badge or an icon.

---

## VISUAL FOUNDATIONS — Admin v2 standard

The whole system follows the Admin v2 language first built in `ui_kits/crm-v2/`: floating white cards on a warm stone canvas, pill controls, very soft shadows, Geist type. The brand palette (green + gold) is unchanged.

**Palette.** Deep green (`--brand-primary` #1F3A2C) is the institutional colour: primary buttons, selected states, the hero KPI. The active nav item and inverse surfaces use near-black green `--surface-inverse` #12241B. Gold (`--brand-accent` #C49A4E) is the accent: focus ring, probability bars, previous-period markers, at most one gold KPI. **One gold element per view.** Neutrals are warm stone: canvas `#F2F1EC`, sunken `#F6F5F1`, muted `#EEECE6`, lines `#ECEAE4`/`#DCD9D0`, text `#141B17` / muted `#4B5450` / faint `#848A86`. Status colours stay muted and earthy, always as soft pairs (`--status-*-bg` + `-fg`). Sand is a brand-only family (site, signage pieces) and no longer appears in the CRM. Pipeline stages keep `--stage-1`…`--stage-10`.

**Type.** **Geist** for all UI and headings; **Geist Mono** only for technical codes (matrícula, CAR, CCIR, IDs) and the small caps label `.gv-eyebrow`; **Jost** only for the wordmark. Headings are semibold with negative tracking (h1 30/−.025em, h2 22, card titles 16, KPI values 30/−.03em). Body is 14px, controls 13.5px/500, labels 13px muted, table headers and captions 12px faint — hierarchy by colour more than by size. Every number uses `tabular-nums`. Sentence case everywhere; uppercase only for the wordmark and `.gv-eyebrow`.

**Layout and shell.** The CRM is a shell of floating cards separated by one gap: `--gap-shell` 16px (12px mobile), sidebar card 264px, topbar card 64px, content max 1320px, card padding 20px (14px mobile). Only `main` scrolls. Rows are 56px (44 dense), controls 40px (32 sm / 48 lg), touch targets ≥ 44px.

**Responsive — full mobile, nothing lost on desktop.** Container breakpoints on the app frame:
- **> 1180px** full sidebar + topbar with metrics and user chip.
- **760–1180px** sidebar collapses to a 76px icon rail; KPIs go 2×2; side panels stack under the main card.
- **≤ 760px** compact header, floating bottom tab bar (68px, 24px radius) with a "Menu" sheet for the remaining modules, FAB for the main create action, tables become stacked record cards, kanban becomes a stage picker + list, drawers and dialogs become bottom sheets (28px top radius, grab handle), bulk bar and toasts dock above the tab bar.
Desktop keeps the power features: column picker, multi-select with a floating bulk bar, inline row actions on hover, prev/next in detail drawers, ⌘K search.

**Cards.** White, **no border**, `--radius-card` 20px (18px mobile), `--shadow-sm`. Headers have no rule: title 16/600 plus an optional grey subtitle, actions on the right. Clickable cards lift 1px to `--shadow-md`. Featured items get a thin gold inner ring, not a coloured edge. One **hero** card per view (`tone="hero"`: green gradient `--gradient-hero`, white text).

**Corner radii.** 6 xs · 10 sm · 12 inputs · 12 nav items · 14 md (deal cards, media, popovers) · 20 cards · 24 modals/drawers · 28 mobile sheets · pill for buttons, segmented controls, badges, search. Icon buttons and avatars are circles.

**Shadows.** Two-layer, very low contrast, green-black `rgba(20,27,23,…)`: xs (buttons, segmented thumb) → sm (cards) → md (hover) → lg (popover, toast, bulk bar) → overlay (drawer, modal). Primary buttons add `--shadow-primary` (inner highlight + green drop). Hairlines are used only *inside* cards: table rows, card footers, list separators.

**Controls.** Buttons are pills: primary green, secondary white + xs shadow, soft stone, dark, ghost, soft-red danger. Icon buttons are 40px circles (outline variant = white + inset line, used in the topbar). Inputs are stone-filled with no visible border; on focus they turn white with a gold 1px inset + `--ring-focus`. Tabs come in two forms: **segmented** pill track with a raised white thumb (filters, periods, views) and **underline** for record sections. Badges are soft pills with a 6px dot. Deltas are tiny semibold pills with an arrow.

**Tables.** Inside a card with no padding; header band `--surface-sunken` with 12px faint sentence-case labels; 56px rows separated by hairlines; hover `--surface-hover`; selected `--surface-selected`; row actions fade in on hover. On mobile each row becomes a record card.

**Hover / press / focus / disabled.** Hover darkens filled buttons one step and gives ghost controls a stone fill. Press translates +1px. Focus is always the gold ring (never blue). Disabled = opacity .45 + not-allowed.

**Overlays.** Scrim `--scrim-modal` (28% green-black) with 2px blur. Drawers float 16px from the edges at 24px radius on desktop; on mobile they are bottom sheets. Toasts are dark (inverse) pills of 14px radius with a tinted icon circle.

**Backgrounds and imagery.** Flat colour; the only gradients are the hero/gold KPI fills and the photo scrims (`--scrim-bottom`, `--scrim-flat`). Photography is warm and real; placeholders are stone blocks labelled with what belongs there.

**Motion.** 80/140/220/360ms, `cubic-bezier(.2,.6,.25,1)`. Fades and short translations (drawer slide 24px, sheet rise, toast rise 8px). No bounce, no spring; nothing animates on page load.

---

## ICONOGRAPHY

**Substitution flagged:** the source material contains no icon set, sprite or icon font. The system uses **Lucide** (1.5px stroke, rounded caps, outline only) loaded from CDN — `https://unpkg.com/lucide-static@0.428.0/icons/<name>.svg` — masked to `currentColor` by the `Icon` component. The stroke is set to 1.5 rather than Lucide's default 2 — lighter lines sit better next to Geist at UI sizes. Lucide was chosen because its even stroke weight and geometric construction sit well with Geist. If Grand Vista has a preferred icon set, replacing it is a one-line change in `components/core/Icon.jsx`.

Rules:
- Outline only, one weight, one size per context: 14px inline with text, 16px in buttons, 18px default, 20–24px in headers and empty states.
- Icons are monochrome and inherit text colour. Icons in KPI cards sit in a 32px round stone chip. The only coloured icons are status-tinted glyphs in ChecklistItem/Toast.
- Icons never appear alone as an action without an accessible label (`IconButton` requires `label`).
- **No emoji, ever.** No unicode symbols used as icons. The only non-alphabetic characters in copy are `·` as a separator, `—` for missing data, `R$`, `%` and `–` in ranges.
- Vocabulary in use: `tractor` (fazenda), `users` (compradores), `handshake` (oportunidade), `kanban` (pipeline), `shield-check` (due diligence), `calendar-clock` (agenda), `droplets` (água/irrigação), `wheat` (cultura/aptidão), `ruler` (área), `truck` (logística/armazém), `map-pin` (localização), `file-text` (documentos), `trending-up` (indicadores), `message-circle` (WhatsApp), `mail` (e-mail).
- WhatsApp is a first-class channel in this business and is represented by `message-circle` — the official WhatsApp glyph is trademarked and was not copied in.

**Imagery.** Only one real image exists: `assets/logo-fachada-grandvista.jpeg` (the signage). It is used once, as the site hero. Every other image slot renders a sand placeholder labelled with what belongs there. No stock, generated or drawn imagery was added — property photography and video are supplied by Grand Vista.

---

## Index

**Root**
- `styles.css` — the single entry point consumers link; `@import`s only.
- `readme.md` — this file. `SKILL.md` — Agent-Skills wrapper. `thumbnail.html` — homepage tile.
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `radius.css`, `elevation.css`, `motion.css`, `base.css`, plus `admin-v2.css` (short `--a2-*` aliases of the core tokens).
- `assets/logo-placa-grandvista.png` — brand plaque render, 1062×440, best available lockup. `assets/logo-fachada-grandvista.jpeg` — the original signage photograph.
- `guidelines/` — 20 foundation specimen cards (Colors, Type, Spacing, Brand) plus `escopo-crm.md`, the original scope.

**Components** (`components/<group>/`, each with `.jsx`, `.d.ts`, `.prompt.md`, and one card HTML per group)
- `core/` — Icon, Button, IconButton, Card, Badge, Tag, Wordmark
- `forms/` — Field, Input, Textarea, Select, Checkbox, Switch, SearchBar
- `data/` — StatCard, DataTable, MatchScore, ProgressBar, ChecklistItem, FarmCard, DealCard, PipelineColumn, SpecList, ActivityTimeline
- `navigation/` — SidebarNav, Tabs, TopBar, StageStepper
- `feedback/` — Dialog, Toast, EmptyState

**UI kits**
- `ui_kits/crm-v2/` — CRM Rural (Admin v2, the reference implementation): dashboard, fazendas, pipeline, compradores, detail drawers; fully responsive down to mobile. See its README.
- `ui_kits/data.js` — shared pt-BR demo data for both kits.
- `ui_kits/site/` — Site de captação: home, listagem filtrada, ficha pública. See its README.

### Intentional additions
No source defined a component inventory, so the set above is authored from the scope's needs. Two entries are worth flagging explicitly:
- **Icon** — a wrapper over the substituted Lucide set, so the glyph source can be swapped in one place.
- **Wordmark** — a type-only lockup standing in for the missing vector logo.
Domain components (MatchScore, PipelineColumn, DealCard, FarmCard, ChecklistItem, StageStepper, SpecList, ActivityTimeline) map one-to-one onto named modules in the scope document rather than being generic design-system furniture.

### Known gaps
- No vector logo (only raster: plaque render + signage photo), no brand font files, no icon set, no property photography, no existing product UI or codebase.
- Geist / Geist Mono and Jost are substitutions; Lucide is a substitution.
- Scope modules without screens: usuários e perfis, logs de auditoria, agenda, relatórios/exportação, due diligence as a standalone module. They are stubbed, not invented.
