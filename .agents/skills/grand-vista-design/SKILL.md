---
name: grand-vista-design
description: Regras de marca e de UI da Grand Vista Fazendas Imobiliária (corretora de fazendas, pt-BR). Use antes de criar ou alterar qualquer interface do CRM — tela, componente, story, texto de UI, cor, tipografia, espaçamento, ícone — e antes de protótipos ou mocks com a marca.
user-invocable: true
---

# Grand Vista — Design System

O Design System de produção é `packages/ui`. A referência visual de onde ele saiu fica em `design-system/referencia/`: lê-se, nunca se importa (ADR `docs/adr/0003-design-system-export-e-referencia.md`).

## Leia primeiro

1. `design-system/referencia/README.md` — marca, voz, casing, números, ausência de dado, iconografia. É a fonte das regras de redação de UI.
2. `docs/specs/design-system.md` — camadas (tokens, primitivos shadcn, componentes de domínio), nomes de classe do tema do Tailwind, desvios deliberados do export (API e superfície dos campos).
3. `packages/ui/CLAUDE.md` — convenções do pacote: `Icon` e seu registro, `Field`, `cn`, receitas de classe, `pressable`.
4. `CONTEXT.md` — glossário. Nome de componente e rótulo de tela seguem o glossário, não o export.

## Onde está cada coisa

- Componentes de produção: `packages/ui/src/components/` e `packages/ui/src/primitives/`, exportados por `@crm/ui`. Antes de criar um componente, procure-o lá — e no Storybook (`pnpm storybook`), em `packages/ui/stories/`, com variantes e estados.
- Tokens: `packages/ui/src/tokens/`; tema do Tailwind: `packages/ui/src/theme.css`.
- Comportamento esperado de cada componente: `design-system/referencia/prompts/` (`<grupo>/<Nome>.prompt.md`). `MatchScore` é o `CompatibilityGauge`, `DealCard` é o `OpportunityCard`, `ActivityTimeline` é o `AuditTimeline`.
- Referência visual por tema (cor, tipo, espaçamento, estados, movimento, marca, elevação): `design-system/referencia/guidelines/`.
- Layout das telas do CRM (três faixas responsivas, mobile, superfícies): `design-system/referencia/ui_kits/crm-v2/README.md`. É andaime de protótipo: extraia decisões, não porte código.
- Marca em raster: `packages/ui/assets/`.

## Regras que não se negociam

- Texto de UI em português brasileiro, sentence case, verbo primeiro nos botões ("Cadastrar fazenda"), sem emoji, sem exclamação. Dado ausente é travessão (—), nunca "N/A".
- Cor, espaçamento, raio, sombra e fonte só pelos tokens, via classes do tema (`bg-surface-card`, `p-6`, `text-text-body`). Nada de hex, px cru, paleta crua `--gv-*` nem fonte fora de Geist, Geist Mono e Jost — o `pnpm lint` barra.
- Campo de formulário segue os estados de `packages/ui`, não os do export: branco com filete em repouso, contorno dourado e anel de foco quando focado, afundado só quando desabilitado (tabela em `docs/specs/design-system.md`, "Divisão de camadas"). No código, pelas receitas `fieldSurface` e `fieldFrameSurface`; em protótipo, copie esses estados — o afundado do export ficou para trás.
- Todo glifo passa pelo `Icon`; glifo novo entra no registro de `packages/ui/src/components/icon.tsx`.
- Não existe logotipo vetorial. O monograma não é desenhado, aproximado nem gerado: onde iria o logotipo vai o `Wordmark`; a placa em raster só grande, sobre fundo simples.
- Componente que serve a dois módulos vai para `packages/ui`, com story. Story nova entra em `packages/ui/stories/` com o nome do arquivo do componente.

## Protótipos e mocks

Para artefatos descartáveis (HTML estático, mocks), as páginas de `design-system/referencia/` consomem `design-system/referencia/styles.css`, que importa os mesmos tokens — copie dali. Fotos de fazenda não existem no material: use o espaço em areia com o rótulo do que vai ali, nunca imagem genérica.
