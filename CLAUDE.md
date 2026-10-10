# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Idioma

Toda a comunicação deste projeto é em **português brasileiro (pt-BR)**: respostas ao usuário, mensagens de commit, comentários de código, documentação e qualquer pergunta ou alinhamento necessário durante o trabalho.

A regra no código é por natureza do texto, não por arquivo:

- **Nomes em inglês, sempre** — variáveis, funções, classes, tipos, constantes, arquivos de código, tabelas, colunas, aliases de SQL, chaves de config. Ex.: `createPool`, `InvalidEnvError`, `roles.integration.test.ts`, `access_profiles`.
- **Texto informativo em pt-BR** — comentários, docs, descrições de teste (`it('nomeia a variável ausente')`), mensagens de erro e de log, textos de UI, mensagens de commit.

Termos de domínio seguem o glossário (`CONTEXT.md`): o rótulo visível em português, o identificador em inglês (`tenant_id` no código, "empresa" na tela).

## Repository state

The monorepo is scaffolded (`docs/specs/fase-0-monorepo.md`); features are built spec by spec, in the order of `docs/specs/README.md`. Before writing code, read both source documents:

- `Escopo CRM.md` — the commercial scope proposal (in Portuguese) for the client, Grand Vista. Describes *what* the system must do: modules, fields, dashboards, business rules. This is the contract; do not silently deviate from it.
- `Plano_Geral_de_Desenvolvimento.md` — the technical build plan derived from the scope. Describes *how*: stack, architecture, data model, phased roadmap, and testing strategy. **This is the primary reference for all technical decisions** — check it before introducing a pattern, dependency, or module boundary it doesn't already define.

Both documents are living plans for a solo developer (user + Claude) build. When scope or architecture questions come up, resolve them by reading these files first rather than guessing; update them if a decision changes.

## Project: CRM Rural (Grand Vista)

A multi-tenant CRM tailored to high-value rural real estate brokerage (farm buying/selling), replacing spreadsheets/WhatsApp/paper agendas. Solo build, TDD, MVP (cadastros + funil comercial) targeted at 3 months, full system at 6 months.

## Stack

- **Backend:** Node.js + Hono + Drizzle ORM + PostgreSQL + Zod
- **Frontend:** React + Vite + shadcn/ui + TanStack Query + React Hook Form + MapLibre
- **Auth:** Better Auth, using its `organizations` plugin to model tenants
- **Storage:** Cloudflare R2 (S3-compatible), direct upload via signed URL
- **Tests:** Vitest (unit + integration against a real Postgres container) + Playwright (E2E)
- **Monorepo:** pnpm workspaces

Hono's RPC (`hc<AppType>`) exports route types straight to the React client — no code generation, no duplicated client. Zod validates at the HTTP boundary, feeds forms via `@hookform/resolvers`, and generates the OpenAPI docs the scope requires, all from the same schemas.

### Planned monorepo layout

```
crm/
├── apps/
│   ├── api/          # Hono + Drizzle + Better Auth + OpenAPI
│   └── web/          # React + Vite + Design System
└── packages/
    ├── db/           # Drizzle schema + migrations (single source of truth)
    ├── shared/       # Zod schemas, types, field metadata, constants
    └── ui/           # Design System: components, tokens, Storybook docs
```

Each business module is a self-contained folder at `apps/api/src/modules/<name>` (routes, service, schemas) registered on the root router, mirrored at `apps/web/src/modules/`. Its tests live outside `src/`, at `apps/api/test/modules/<name>`. Adding a module should not require touching another module — this is a direct requirement from the scope ("possibilidade de criação de novos módulos").

## Architectural decisions that must not be relitigated

These are closed decisions from `Plano_Geral_de_Desenvolvimento.md` — follow them rather than re-deriving an approach:

- **Multi-tenant from day one.** Single schema, `tenant_id` on every business table, Postgres Row-Level Security enforcing isolation. This is Phase 0 work, before any feature, with dedicated tests — tenant data leakage is the worst possible failure in this system.
- **RBAC is granular and tenant-configurable**, not fixed roles in code. A permissions catalog (module + action, e.g. `fazendas.criar`, `comissao.ver_de_terceiros`) is defined in code and synced by migration; each tenant composes its own access profiles from it. Admin/Gestor/Corretor ship as seeded profiles. The permission *engine* is Phase 0; the profile-administration *screen* is deliberately deferred to Phase 3 (it's a CRUD over structures that already exist by then).
- **Super admin** is a boolean flag (`is_super_admin`) settable only via CLI script — never through any route, screen, or payload — and must be stripped from every API response and every listing (super admin appears as a normal user everywhere). This is a tested invariant, not a convention.
- **Four layers of access control**, outer to inner: tenant (RLS) → permission (route middleware) → data scope (per-module, "own records only" vs "all") → commission visibility (service-layer filter; without `comissao.ver_de_terceiros` a user only ever sees their own row, never a colleague's or the total).
- **Audit log is one generic mechanism** (`audit_log`: tenant, entity, entity_id, field, old value, new value, user, timestamp) serving both the general "logs de auditoria" requirement and the per-farm "histórico de alterações" field. Fed by a Drizzle write wrapper, not by developer discipline.
- **Referral chain (`referral_links`)** is independent of commission. It models N-level introduction chains for both contacts and farms ("Pedro came through João, who got it from Sebastião") and is unrelated to who gets paid.
- **Commission** is a percentage of sale value, per group, with equal split inside a group by default and an optional per-member override. The arithmetic lives in a pure, testable service, isolated from HTTP and DB — it's exercised by unit tests, not integration tests.
- **Money is `numeric`, never `float`.** Custom fields are typed-per-tenant `JSONB` (not EAV). Municipality is a referenced table, not free text — required for reliable regional matching/aggregation.
- **Matching is deterministic SQL, not ML.** A parameterized query scores region/hectare range/value range/aptitude/crop matches against tenant-configurable weights (`matching_rules`), producing a 0–100% compatibility score. `CompatibilityGauge` is a single shared component across the matching list, farm page, and buyer page.
- **Design System (`packages/ui`) is first-class**, not polish — documented in Storybook, tokens-based. A new module should consume more components than it creates; if something new is needed and would serve two modules, it belongs in `packages/ui`. `AsyncCombobox`, `Pagination`, and `DateRangePicker` are foundational — most pickers and filters build on them.
- **Field metadata is centralized** in `packages/shared`: one registry maps every entity field to its Portuguese label, type, and formatting, feeding forms, table headers, report filters, and the audit-history view alike. A label changes in exactly one place.

## Testing strategy (TDD, test-first)

- **Unit (Vitest):** pure business rules with mocked dependencies — commission split, matching score, saca value calculation, referral chain assembly, inertia thresholds. These live in I/O-free services specifically so they're trivial to test.
- **Integration (Vitest + real Postgres in a container):** HTTP routes against a real DB with migrations applied from scratch. Covers RLS, per-role permissions, commission visibility, audit — things no mock can prove.
- **E2E (Playwright):** critical end-to-end flows, e.g. register farm → check compatible buyers → create opportunity → set commission groups → move through pipeline → log activity.
- **Tests never live in `src/`.** Each package keeps them in its own `test/` folder, mirroring the `src/` path of what they exercise (`src/modules/farms/service.ts` → `test/modules/farms/service.test.ts`); helpers shared between tests go in `test/support/`. `src/` holds only what ships to production. A guard test (`test/no-tests-in-src.test.ts`) fails otherwise.
- No feature is done without a test. Where a test diverges from what production actually executes, the test is worthless — always exercise the real code path.

## Roadmap phases (for sequencing decisions)

0. **Foundation** — monorepo, Docker Postgres, Drizzle migrations, Better Auth + organizations, granular permission engine with seeded profiles, `is_super_admin` + CLI script, RLS active and tested, audit wrapper, test infra, Design System base + Storybook, CI, authenticated "hello world" deployed.
1. **Base records** — Settings module, Contacts (buyer/owner/broker roles), referral chain, Farms with all technical fields/galleries/documents/custom fields/map, saca value calc, IBGE municipality load, search/filters.
2. **Commercial (MVP at 3 months)** — Opportunities, kanban funnel (10 configurable stages), commission groups, matching engine both directions, WhatsApp/email opportunity sharing.
3. **Operations** — access-profile administration screen, commercial agenda, due diligence checklists.
4. **Intelligence** — full dashboard, inertia alerts, reports, Excel/PDF export. Deliberately late — metrics need real accumulated data.
5. **Production hardening** — onboarding, OpenAPI docs, Design System docs, backups, monitoring, E2E/perf/accessibility hardening.

If Phase 1 slips, the agreed cut order is: matching config screen (keep default weights in code) → custom fields → video galleries (keep photos). All three return in Phase 4 without rework. Cadastros, referral chain, funnel, commission, and matching working are non-negotiable for the 3-month milestone — don't cut those to save time.

## Verification commands

```
pnpm install            # Node 22 (.nvmrc), pnpm pelo packageManager
pnpm db:up              # Postgres 18 em container: bancos crm_dev e crm_test, papéis crm_owner e crm_app
pnpm dev                # API (tsx watch) + web (Vite); a API lê o `.env` (copie de `.env.example`)
pnpm build              # artefatos de produção dos cinco pacotes
pnpm typecheck          # tsc --noEmit strict em todos os pacotes
pnpm lint               # oxlint, com as regras de aderência ao Design System
pnpm test               # projeto Vitest `unit` — sem banco, sem container
pnpm test:integration   # projeto `integration` — zera crm_test e aplica as migrations do zero
pnpm test:e2e           # Playwright
```

Every phase: full suite green, typecheck clean, migrations applying to a zeroed database, and the module exercised in the browser via `pnpm dev`.

## Agent skills

### Issue tracker

Issues deste repositório vivem no GitHub (`logics/crm-grand-vista`), via CLI `gh`. Ver `docs/agents/issue-tracker.md`.

### Triage labels

Vocabulário padrão de 5 papéis (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), sem mapeamento customizado. Ver `docs/agents/triage-labels.md`.

### Domain docs

Layout single-context: `CONTEXT.md` + `docs/adr/` na raiz. Ver `docs/agents/domain.md`.
