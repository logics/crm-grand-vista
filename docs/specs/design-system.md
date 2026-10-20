# Spec — Design System (`packages/ui`)

> **Leitura obrigatória antes de começar:** `CLAUDE.md`, `CONTEXT.md` (glossário), `docs/adr/0003-design-system-export-e-referencia.md`, e a seção "Design System" do `Plano_Geral_de_Desenvolvimento.md`. Esta spec é autossuficiente: não há histórico de conversa a recuperar.

## Objetivo

Transformar o export do Claude Design — o dump com o design system da Grand Vista, versionado no commit `f85ca62` e apagado ao fim desta trilha — em `packages/ui`, o Design System de produção do projeto. O export é **referência visual e fonte dos tokens, não código de produção**.

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
| `_adherence.oxlintrc.json` (31KB) | Config de aderência ao DS, formato **oxlint** | **Vira a config de lint do projeto** (`.oxlintrc.json`). O projeto não tem nenhuma hoje, então não há config na qual integrar. O import da referência (`design-system/`) é barrado por ela; `test/lint-adherence.test.ts` prova cada regra contra arquivos lintados de verdade |
| `SKILL.md` | Descritor de skill (`grand-vista-design`, user-invocable) | Instalar como skill em `.claude/skills/grand-vista-design/` (link para `.agents/skills/`, como as demais), apontando para `design-system/referencia/`. Faz qualquer agente que mexa em UI carregar as regras de marca automaticamente. `test/grand-vista-design-skill.test.ts` falha se um caminho citado deixar de existir |
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

A **API** dos primitivos é a do shadcn/Radix, em partes compostas (`Dialog` + `DialogTrigger` + `DialogContent` + `DialogTitle`…, `Checkbox` com `checked`/`onCheckedChange`), não a do export (`<Dialog title footer onClose>`, `<Checkbox label onChange>`). Do export vêm a aparência e as variantes (`sheet` no diálogo, `segmented`/`underline` nas abas). Por isso as regras de props de `Dialog`, `Checkbox`, `Switch`, `TabItem` e `SelectOption` (no shadcn, `SelectItem`) saíram da config oxlint de aderência: descreviam a API do export, e as props do Radix são verificadas pelo TypeScript. Rótulo e descrição ao lado de `Checkbox` e `Switch` (o `label`/`description` do export) ficam com quem compõe o campo — o `Field`. Combobox e DatePicker não são primitivos à parte: chegam como composição (Command + Popover, Calendar + Popover) no `AsyncCombobox` e no `DateRangePicker`.

Todo glifo passa pelo `Icon`, primitivos inclusive, para que a fonte dos glifos troque num lugar só. O `Icon` do export buscava o SVG numa CDN por um nome livre; o de `packages/ui` empacota os glifos do `lucide-react` (o mesmo conjunto Lucide) num registro de nomes kebab-case (`map-pin`, `tractor`), verificado pelo TypeScript — glifo novo entra no registro. Tamanhos, cores e medidas que o export escrevia em px (`size={18}`, `color`, `padding="20px"`, `height={6}`) viram escalas nomeadas sobre os tokens (`size="lg"`, classe de cor, `padding="none"`, `height="md"`).

Os componentes de apresentação mantêm as props do export (`variant`, `tone`, `icon`, `count`…) e aceitam os atributos nativos do elemento que renderizam (`onClick`, `type`, `aria-*`), como os `.d.ts` do export já declaravam. Por isso as regras oxlint que listavam as props aceitas de cada um deles também saíram — inclusive as de `Textarea` e `Toast`, que ainda não existem em `packages/ui`: barravam `onClick` num `Button` e `placeholder` num `Textarea`. As props seguem verificadas pelo TypeScript; as regras de **valor** de variante (`<Button variant>`, `<Badge tone>`…) ficam. Três desvios deliberados da API do export: `Input` marca inválido por `aria-invalid` (como os primitivos), não por `invalid`; o `onSubmit` do `SearchBar` recebe o termo digitado antes do evento, e `inputProps` chega ao campo; `Button` tem `type="button"` por padrão, e só envia formulário quem declara `submit`.

Nos componentes de domínio, os desvios são de forma, não de aparência. As entradas do `AuditTimeline` são alterações salvas — título, autor, instante e a lista de campos com valor anterior e novo (`changes`) —, e o glifo é escolhido por entrada (`icon`): o `kind` do export (visita, ligação, reunião…) era tipo de atividade da agenda, não de alteração. `ChecklistItem` é um `<li>` e `ChecklistPanel` a lista que o contém, com título, contagem e barra de conclusão; `PipelineColumn` é uma região nomeada pela etapa e `KanbanBoard` o quadro rolável que as põe lado a lado — os dois níveis de cada par, que o export não tinha. Cartão e linha de tabela clicáveis (`FarmCard`, `OpportunityCard`, `DataTable` com `onRowClick`) também respondem ao teclado. As faixas do `CompatibilityGauge` têm apelidos de cor próprios (`--compatibility-high`, `-medium`, `-low`), porque a faixa média, dourada, não tinha apelido semântico.

O `Field` liga rótulo, dica e erro ao controle por contexto, não por prop injetada no filho: o controle pode estar aninhado (o `SelectTrigger` dentro do `Select`). `Input`, `SelectTrigger`, `Checkbox` e `Switch` leem esse contexto (`id`, `aria-describedby`, `aria-invalid`, `aria-required`), e o que o controle declara vence. `Input` é primitivo do shadcn com a moldura do export (ícone, prefixo, sufixo); entra junto dos componentes núcleo porque `Field` e `SearchBar` dependem dele.

A superfície dos campos de formulário é **desvio deliberado de aparência**: no export o campo era afundado (`--surface-sunken`) sem filete, e quase não se separava do fundo da tela nem do cartão branco. Em `packages/ui` os estados são:

| Estado | Superfície |
|---|---|
| Repouso | branca (`bg-surface-card`) com filete `border-default` |
| Focado ou aberto (lista, calendário) | branca, contorno `brand-accent` e anel `shadow-ring-focus` |
| Inválido (`aria-invalid`) | contorno `status-danger-fg`; com foco, anel `shadow-ring-danger` |
| Desabilitado | afundada (`bg-surface-sunken`) e esmaecida |

Afundado, num campo, quer dizer desabilitado — não é cor de repouso nem de destaque. Os estados vivem em duas receitas de `src/lib/styles.ts`, que mudam juntas: `fieldSurface`, no próprio controle (`SelectTrigger`), e `fieldFrameSurface`, na moldura em volta dele (`Input` — e, por ele, `SearchBar`, `MoneyInput`, `AreaInput` e `PercentInput` —; gatilho do `AsyncCombobox`). Controle novo usa uma das duas, não reescreve as classes. O que faz papel de campo sem ser um — a área de envio do `MediaUploader`, com filete tracejado — segue os mesmos estados: branca em repouso, contorno dourado e anel de foco ao receber arquivos, afundada quando desabilitada. Chip ou etiqueta dentro do campo usa o `Tag` de pedra, que contrasta com o branco.

Os estilos inline do export **não atravessam**: não suportam media query, container query, pseudo-classe nem tema escuro. O próprio kit `crm-v2` do export abandonou inline em favor de um arquivo CSS.

`ui_kits/crm-v2/ui.jsx` é uma implementação **paralela** (`A2Btn`, `A2Icon`, classes `a2-*`) que não importa nada de `components/` e carrega ícones de CDN. Não é uma versão alternativa dos componentes: é andaime de protótipo. Ler para extrair decisões de layout, nunca portar.

## Tema do Tailwind

Tailwind 4, configurado em CSS. A aplicação importa uma folha só, `@crm/ui/styles.css`: tokens, reset (preflight), `base.css` dos tokens na camada `base` e o tema, `packages/ui/src/theme.css`.

- **O tema padrão do Tailwind não é importado.** Paleta, escala, fontes e raios vêm só dos tokens; classe fora deles (`text-2xl`, `bg-red-500`, `p-14`) não gera CSS.
- **O tema não escreve valor:** cada entrada é `var(--token)`. A exceção são as faixas responsivas (`--bp-rail`, `--bp-mobile`), copiadas literalmente porque media query e container query não leem `var()`. Um teste amarra a cópia ao token.
- **Classe = prefixo do utilitário + nome do token:** `bg-surface-card`, `border-border-subtle`, `text-status-danger-fg`, `bg-stage-3`, `rounded-card`, `shadow-sm`, `shadow-ring-focus`, `bg-gradient-hero`, `ease-standard`, `transition-control`. Para as escalas, o prefixo do token cai: `p-6` usa `--space-6`, `text-h1` usa `--size-h1`, `leading-snug` usa `--lh-snug`, `font-semibold` usa `--weight-semibold`, `duration-fast` usa `--dur-fast`, e `max-rail:`/`@max-rail:` usam `--bp-rail`.
- **Cuidado: `text-body` é tamanho (`--size-body`); `text-text-body` é cor (`--text-body`).** O mesmo vale para os demais tokens `--text-*` de cor.
- A paleta crua (`--gv-*`) e os apelidos `--a2-*` do kit crm-v2 continuam como variável CSS, mas não viram utilitário: componente usa os apelidos semânticos, e citar `--gv-` em código é erro de lint. Cor que nenhum apelido cobre ganha um em `tokens/colors.css`, como as `--brand-wordmark-*` da assinatura.

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

### DateRangePicker

Seletor de período (Calendar + Popover, sem dependência nova), com o comportamento do `RangePicker` do AntDesign. A spec do componente fica aqui, no Design System, porque filtros e relatórios de vários módulos o consomem. Não há variante de data única: nasce quando um módulo pedir, sobre a mesma base.

- **Valor:** `{ from?: string; to?: string }` em ISO `aaaa-mm-dd` (o mesmo formato que o Zod valida e o `date` do Postgres guarda), nunca `Date`: a string não tem fuso e o dia não anda uma casa entre navegador e API. Só muda com o intervalo **completo e válido**, ou `{}` ao limpar; a obrigatoriedade das duas pontas é do schema do formulário.
- **Campo:** dois campos de texto com máscara `dd/mm/aaaa` e uma seta entre eles. Digitação incompleta, inexistente, invertida ou em dia desabilitado não altera o valor (a ponta fica `aria-invalid`) e o texto volta ao valor quando o foco sai. Digitar e o calendário andam juntos.
- **Calendário:** dois meses lado a lado (um no mobile). O primeiro clique só marca o início; o segundo completa o intervalo (se vier antes, as pontas se invertem) e fecha. Fechar com só o início descarta a escolha.
- **Atalhos** (`presets`): últimos 7 dias, este mês, mês passado e este ano por padrão; configuráveis, `[]` esconde a coluna. Atalho com dia desabilitado fica desabilitado.
- **Datas desabilitadas** (`disabledDates`): qualquer `Matcher` do react-day-picker (antes/depois, intervalo, dia da semana, função). `disabled` é o campo inteiro, como nos outros controles.
- **Teclado:** digitar, clicar ou a seta para baixo abrem; a seta para baixo leva o foco ao calendário, onde as setas andam pelos dias; Esc fecha e devolve o foco ao campo.
- **Formulário:** controlado por `value`/`onChange`/`onBlur`, pronto para o `Controller` do React Hook Form. Dentro do `Field`, ele nomeia o grupo e o erro marca as duas pontas como inválidas. `size` e a superfície seguem `fieldSize` e `fieldFrameSurface`.

## Marca

Não existe logotipo vetorial — só raster. O `readme.md` do export é explícito: **o monograma não deve ser aproximado ou reconstruído**. Enquanto o vetor não chegar, a marca aparece pelo componente `Wordmark`, somente tipográfico; a placa em raster só em tamanho grande sobre fundo simples. Não gerar, redesenhar ou aproximar o logotipo.

## Critérios de aceite

- `packages/ui` compila com `tsc --noEmit` limpo; nenhum arquivo `.jsx` restante
- Storybook sobe e cada componente exibe suas variantes e estados
- Os 237 tokens estão disponíveis como variáveis CSS e consumidos pelo tema do Tailwind
- Nenhum componente de `packages/ui` importa de `design-system/referencia/`
- As referências HTML abrem no navegador e renderizam sozinhas, com o export já apagado
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
7. **Só então** apagar o export, em commit separado

O export está versionado em git (commit `f85ca62`), então erro de triagem é recuperável — mas a exclusão só acontece depois do passo 6 verificado.

## Depende de

`fase-0-monorepo.md` — `packages/ui` precisa existir como pacote compilável, criado pelo scaffold. Esta spec não cria o monorepo.

Não depende da trilha de banco, autenticação ou permissões: é paralelizável com toda ela.
