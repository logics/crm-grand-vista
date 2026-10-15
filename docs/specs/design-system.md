# Spec — Design System (`packages/ui`)

> **Leitura obrigatória antes de começar:** `CLAUDE.md`, `CONTEXT.md` (glossário), `docs/adr/0003-design-system-export-e-referencia.md`, e a seção "Design System" do `Plano_Geral_de_Desenvolvimento.md`. Esta spec é autossuficiente: não há histórico de conversa a recuperar.

## Objetivo

Transformar `design-system-export/` — o dump do Claude Design com o design system da Grand Vista — em `packages/ui`, o Design System de produção do projeto. O export é **referência visual e fonte dos tokens, não código de produção**.

## Vocabulário

`CONTEXT.md`: **Compatibilidade** (o que `CompatibilityGauge` mede), **Oportunidade** (o que `OpportunityCard` representa), **Fazenda**, **Etapa do funil** (as colunas do `KanbanBoard`), **Auditoria** (o que `AuditTimeline` exibe).

Nome de componente segue o glossário, não o export. É a razão da tabela de renomeação abaixo.

## Decisões que governam

- `docs/adr/0003-design-system-export-e-referencia.md` — o export é referência visual e fonte dos tokens, **não código de produção**
- Seção "Design System" do `Plano_Geral_de_Desenvolvimento.md` — a divisão em camadas e os três componentes fundacionais
- `shadcn/ui` não é dependência: é código copiado para dentro de `packages/ui`, escrito sobre os primitivos do **Radix**, do qual passamos a ser donos

## Inventário do export (verificado, 170 arquivos)

Não há componentes duplicados: cada componente aparece uma vez só. Não existe `DESIGN.md` — a fonte da verdade dos tokens são os `tokens/*.css` mais o `readme.md`.

| Caminho | O que é | Destino |
|---|---|---|
| `tokens/` (9 arquivos, 237 variáveis) | base, colors, elevation, fonts, motion, radius, spacing, typography, admin-v2 | **Copiar quase literalmente.** Valor de token é dado, não código. `admin-v2.css` são só apelidos `--a2-*` apontando para os tokens centrais |
| `components/core/` | Badge, Button, Card, Icon, IconButton, Tag, Wordmark | Reescrever em TSX (ver tabela de camadas) |
| `components/data/` | ActivityTimeline, ChecklistItem, DataTable, DealCard, FarmCard, MatchScore, PipelineColumn, ProgressBar, SpecList, StatCard | Reescrever em TSX |
| `components/feedback/` | Dialog, EmptyState, Toast | Dialog vem do shadcn; os outros reescritos |
| `components/forms/` | Checkbox, Field, Input, SearchBar, Select, Switch, Textarea | Primitivos vêm do shadcn; Field e SearchBar reescritos |
| `components/navigation/` | SidebarNav, StageStepper, Tabs, TopBar | Tabs vem do shadcn; os outros reescritos |
| `components/*/*.prompt.md` (31) | Intenção e comportamento de cada componente | **Preservar** em `design-system/referencia/prompts/`. São a especificação de comportamento e matéria-prima das specs de módulo |
| `components/*/*.d.ts` | Tipos declarados à parte do `.jsx` | Absorver nos `.tsx`; não copiar como arquivo |
| `guidelines/*.html` (22) | Referência visual: cores, tipo, espaçamento, estados, movimento, marca, elevação | **Preservar**, com caminhos de asset ajustados para renderizar sozinhos |
| `guidelines/escopo-crm.md` | **Byte-a-byte idêntico** ao `Escopo CRM.md` da raiz | **Descartar.** Não criar segunda fonte da verdade |
| `components/*/*.card.html` (4) | Cartões de referência por categoria | Preservar junto das guidelines |
| `ui_kits/crm-v2/` | Kit de telas do CRM, declarado no próprio README como o padrão do sistema | **Preservar como referência.** Não virar código. Carrega o layout responsivo em três faixas, o comportamento mobile e o padrão de superfície — leitura obrigatória para as specs de tela das Fases 1 e 2 |
| `ui_kits/site/` | Telas do site público de captação | **Preservar arquivado.** Fora de escopo desta fase |
| `ui_kits/data.js` | Dados de exemplo compartilhados pelos dois kits | Preservar junto dos kits, para que renderizem |
| `assets/` | `logo-fachada-grandvista.jpeg`, `logo-placa-grandvista.png` | Mover para `packages/ui`. **Não existe vetor** — ver "Marca" abaixo |
| `uploads/` | Fonte original dos assets, `monty-01..10.webp`, logo duplicada, cópia do escopo | Preservar apenas as imagens que alguma referência usa; descartar duplicatas |
| `_adherence.oxlintrc.json` (31KB) | Config de aderência ao DS, formato **oxlint** | **Vira a config de lint do projeto.** O projeto não tem nenhuma hoje, então não há config na qual integrar |
| `SKILL.md` | Descritor de skill (`grand-vista-design`, user-invocable) | Instalar como skill em `.claude/skills/grand-vista-design/`, apontando para `design-system/referencia/`. Faz qualquer agente que mexa em UI carregar as regras de marca automaticamente |
| `readme.md` | Fundamentos de conteúdo, marca, voz, casing, vocabulário | Preservar como `design-system/referencia/README.md`. É a fonte das regras de redação de UI |
| `styles.css` | Folha que as referências HTML consomem | Preservar junto das referências |
| `.thumbnail`, `thumbnail.html`, `_ds_bundle.js`, `_ds_manifest.json` | Internos da ferramenta | **Descartar** |

## Divisão de camadas (ADR 0003)

| Camada | Origem |
|---|---|
| Tokens | Copiados do export |
| Primitivos interativos: Dialog, Select, Combobox, DatePicker, Tabs, Switch, Checkbox, Popover | **shadcn** (que é Radix por baixo), reestilizado com os tokens |
| Apresentação e domínio: `FarmCard`, `StatCard`, `CompatibilityGauge`, `Wordmark`, `SidebarNav`, `TopBar`, `StageStepper`, `Badge`, `Tag`, `ProgressBar`, `EmptyState`, `AuditTimeline`, `SpecList`, `Icon`, `IconButton`, `Card`, `Field`, `SearchBar`, `OpportunityCard`, `KanbanBoard`, `ChecklistPanel` | **Escritos à mão em TSX + Tailwind**, usando o `.jsx` do export como referência visual e o `.prompt.md` como especificação de comportamento |
| `components/*.jsx` do export | **Nunca importados** |

A **API** dos primitivos é a do shadcn/Radix, em partes compostas (`Dialog` + `DialogTrigger` + `DialogContent` + `DialogTitle`…, `Checkbox` com `checked`/`onCheckedChange`), não a do export (`<Dialog title footer onClose>`, `<Checkbox label onChange>`). Do export vêm a aparência e as variantes (`sheet` no diálogo, `segmented`/`underline` nas abas). Por isso as regras de props de `Dialog`, `Checkbox`, `Switch` e `TabItem` saíram da config oxlint de aderência: descreviam a API do export, e as props do Radix são verificadas pelo TypeScript. Rótulo e descrição ao lado de `Checkbox` e `Switch` (o `label`/`description` do export) ficam com quem compõe o campo — o `Field`. Combobox e DatePicker não são primitivos à parte: chegam como composição (Command + Popover, Calendar + Popover) no `AsyncCombobox` e no `DateRangePicker`, nas specs dos módulos que os usam.

Os primitivos usam os glifos do `lucide-react` direto (o mesmo conjunto Lucide do `Icon` do export). Quando o `Icon` existir em `packages/ui`, os primitivos passam a usá-lo, para que a fonte dos glifos troque num lugar só.

Os estilos inline do export **não atravessam**: não suportam media query, container query, pseudo-classe nem tema escuro. O próprio kit `crm-v2` do export abandonou inline em favor de um arquivo CSS.

`ui_kits/crm-v2/ui.jsx` é uma implementação **paralela** (`A2Btn`, `A2Icon`, classes `a2-*`) que não importa nada de `components/` e carrega ícones de CDN. Não é uma versão alternativa dos componentes: é andaime de protótipo. Ler para extrair decisões de layout, nunca portar.

## Tema do Tailwind

Tailwind 4, configurado em CSS. A aplicação importa uma folha só, `@crm/ui/styles.css`: tokens, reset (preflight), `base.css` dos tokens na camada `base` e o tema, `packages/ui/src/theme.css`.

- **O tema padrão do Tailwind não é importado.** Paleta, escala, fontes e raios vêm só dos tokens; classe fora deles (`text-2xl`, `bg-red-500`, `p-14`) não gera CSS.
- **O tema não escreve valor:** cada entrada é `var(--token)`. A exceção são as faixas responsivas (`--bp-rail`, `--bp-mobile`), copiadas literalmente porque media query e container query não leem `var()`. Um teste amarra a cópia ao token.
- **Classe = prefixo do utilitário + nome do token:** `bg-surface-card`, `border-border-subtle`, `text-status-danger-fg`, `bg-stage-3`, `rounded-card`, `shadow-sm`, `shadow-ring-focus`, `bg-gradient-hero`, `ease-standard`, `transition-control`. Para as escalas, o prefixo do token cai: `p-6` usa `--space-6`, `text-h1` usa `--size-h1`, `leading-snug` usa `--lh-snug`, `font-semibold` usa `--weight-semibold`, `duration-fast` usa `--dur-fast`, e `max-rail:`/`@max-rail:` usam `--bp-rail`.
- **Cuidado: `text-body` é tamanho (`--size-body`); `text-text-body` é cor (`--text-body`).** O mesmo vale para os demais tokens `--text-*` de cor.
- A paleta crua (`--gv-*`) e os apelidos `--a2-*` do kit crm-v2 continuam como variável CSS, mas não viram utilitário: componente usa os apelidos semânticos.

## Renomeação para o glossário

Fazer **na importação**, enquanto nada consome os componentes. Tabela fechada — não inferir outras:

| No export | Em `packages/ui` | Por quê |
|---|---|---|
| `MatchScore` | `CompatibilityGauge` | O glossário define o termo como "Compatibilidade" |
| `DealCard` | `OpportunityCard` | "Deal" não existe no glossário; a palavra é "oportunidade" |
| `ActivityTimeline` | `AuditTimeline` | É o componente do histórico de alterações |

`ChecklistItem` e `ChecklistPanel`, e `PipelineColumn` e `KanbanBoard`, **permanecem como dois níveis legítimos** (item e painel, coluna e quadro) — não são renomeações, e os dois de cada par devem existir.

## Componentes ausentes no export

O plano nomeia três como fundacionais, e **nenhum está no export**: `AsyncCombobox`, `Pagination`, `DateRangePicker`. Os dois mais difíceis ganham base no shadcn — Command + Popover para o combobox, react-day-picker para o calendário. Também faltam `EntityForm`, `MediaUploader`, `DocumentManager`, `ContactPicker`/`FarmPicker`/`MunicipalityPicker`, `ReferralChainEditor`, `CommissionEditor`, `MoneyInput`/`AreaInput`/`PercentInput`.

Esta spec **não** pede que sejam construídos agora: eles pertencem às specs dos módulos que os usam. Aqui só se registra que o export não os cobre.

## Marca

Não existe logotipo vetorial — só raster. O `readme.md` do export é explícito: **o monograma não deve ser aproximado ou reconstruído**. Enquanto o vetor não chegar, a marca aparece pelo componente `Wordmark`, somente tipográfico; a placa em raster só em tamanho grande sobre fundo simples. Não gerar, redesenhar ou aproximar o logotipo.

## Critérios de aceite

- `packages/ui` compila com `tsc --noEmit` limpo; nenhum arquivo `.jsx` restante
- Storybook sobe e cada componente exibe suas variantes e estados
- Os 237 tokens estão disponíveis como variáveis CSS e consumidos pelo tema do Tailwind
- Nenhum componente de `packages/ui` importa de `design-system-export/` nem de `design-system/referencia/`
- As referências HTML abrem no navegador e renderizam sozinhas, com `design-system-export/` já apagada
- A config oxlint de aderência roda no CI
- Nenhum componente novo usa estilo inline onde um token serve
- A skill `grand-vista-design` está instalada e aponta para caminhos que existem
- `git log` mostra o export versionado **antes** da exclusão, e a exclusão é um commit separado

## Fora de escopo

- Construir os componentes ausentes listados acima
- Qualquer tela de módulo de negócio
- O site público de captação (`ui_kits/site` fica arquivado)
- Redesenhar ou vetorizar a marca

## Ordem de execução

1. Triar e reorganizar em `design-system/` (referências, prompts, kits, assets)
2. Tokens para `packages/ui`, ligados ao tema do Tailwind
3. Primitivos do shadcn instalados e reestilizados
4. Componentes de apresentação reescritos em TSX, já com os nomes reconciliados
5. Storybook, config oxlint, skill instalada
6. Ajustar caminhos das referências e **verificar que renderizam**
7. **Só então** apagar `design-system-export/`, em commit separado

O export está versionado em git (commit `f85ca62`), então erro de triagem é recuperável — mas a exclusão só acontece depois do passo 6 verificado.

## Depende de

`fase-0-monorepo.md` — `packages/ui` precisa existir como pacote compilável, criado pelo scaffold. Esta spec não cria o monorepo.

Não depende da trilha de banco, autenticação ou permissões: é paralelizável com toda ela.
