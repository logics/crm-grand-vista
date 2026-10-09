# O export do Claude Design é referência visual, não código de produção

`design-system-export/` traz 31 componentes React prontos, mas eles não são importados pelo projeto: são lidos como referência. Os componentes de produção são reescritos em TSX com Tailwind, os primitivos interativos vêm de shadcn/ui (que é Radix por baixo, copiado para dentro do repositório) e apenas os tokens atravessam quase literalmente — valor de token é dado, não código.

## Considered Options

**Adotar os componentes do export como estão** foi recusado por duas razões. Eles usam estilos inline com variáveis CSS e nenhum Tailwind, o que impede media query, container query, pseudo-classe e tema escuro — o próprio kit `ui_kits/crm-v2` do export abandonou estilo inline em favor de um arquivo CSS, que é a evidência mais direta de que o padrão não se sustenta. E são fracos exatamente onde acessibilidade é difícil: o `Dialog.jsx` do export tem 2KB, enquanto o diálogo do Radix resolve foco preso, trava de scroll, retorno de foco, Escape e ARIA.

**Escrever todos os primitivos à mão** foi recusado porque Dialog, Select, Combobox e DatePicker acessíveis são o trabalho de maior risco e menor visibilidade do projeto: falham em silêncio, com a tela bonita e inutilizável por teclado.

**AntDesign** foi recusado porque é um design system completo, com identidade visual e opiniões próprias de espaçamento, que teria de ser combatido em cada componente — e cujo código não é nosso. A menção a AntD no plano de desenvolvimento é sobre o padrão de UX do seletor de período dele, não sobre adotar a biblioteca.

## Consequences

Os componentes do export que são de apresentação ou de domínio (fichas de fazenda, indicadores, régua de compatibilidade, marca, navegação) não têm equivalente em shadcn e são reescritos à mão a partir do `.jsx` como referência visual e do `.prompt.md` de cada um como especificação de comportamento.

Três componentes que o plano chama de fundacionais — `AsyncCombobox`, `Pagination` e `DateRangePicker` — não existem no export; os dois mais difíceis ganham base no shadcn (Command + Popover para o combobox, react-day-picker para o calendário).

Nomes dos componentes importados são reconciliados com o glossário em `CONTEXT.md` na importação, enquanto nada os consome: `MatchScore` vira `CompatibilityGauge`, `DealCard` vira `OpportunityCard`, `ActivityTimeline` vira `AuditTimeline`.

`ui_kits/site` é o site público de captação, fora do escopo desta fase, e fica arquivado como referência sem virar código.
