# Plano de Desenvolvimento — CRM Rural (Grand Vista)

## Contexto

A Grand Vista atua na compra e venda de fazendas de alto valor. A operação tem características que CRMs genéricos não atendem: campos técnicos de propriedade rural (aptidão, solo, água, produtividade, situação documental), ciclo de venda longo com due diligence, trabalho centrado em curadoria — casar perfil de investidor com fazendas aderentes — e, principalmente, uma **rede de intermediação em cadeia**: compradores e fazendas chegam através de corretores que por sua vez souberam de outros corretores, e a comissão se reparte entre todos eles. Hoje a operação depende de planilhas, WhatsApp e agendas paralelas.

O documento de escopo (`Escopo CRM.md`, na raiz do projeto, revisão de 24/07/2026) é uma proposta comercial: descreve *o que* o sistema faz, mas não *como*. Este plano preenche as lacunas técnicas e organiza a construção em fases.

**Restrições:** desenvolvimento solo (usuário + Claude), MVP com cadastros base e funil em até 3 meses, sistema completo em 6 meses. Diretório vazio, sem git — projeto do zero.

---

## Decisões fechadas

| Tema | Decisão |
|---|---|
| Produto | **Multi-tenant** desde o dia 1 (licenciamento futuro para outras corretoras rurais) |
| Site público de captação | **Fora do escopo** desta fase |
| Isolamento de dados | Schema único + `tenant_id` + Row-Level Security do Postgres |
| Autenticação | Better Auth (plugin de organizations = tenants) |
| Perfis de acesso | **RBAC configurável pelo tenant** — permissões granulares por módulo, N perfis de acesso por usuário. Admin, Gestor e Corretor viram perfis de acesso semeados |
| Super Admin | Flag `is_super_admin` marcada só via CLI, dá acesso total e é **invisível** para os demais usuários |
| Contatos | **Cadastro único com papéis**: comprador, proprietário e/ou corretor externo |
| Proprietário da fazenda | **Opcional** — muitas vezes só é identificado depois |
| Cadeia de indicação | Registrada em N níveis, para contatos e para fazendas; **independente da comissão** |
| Comissão | % **sobre o valor da venda**, por grupo de corretores; dentro do grupo, divisão igual com override individual |
| Valor em sacas | **Calculado** a partir de cotação cadastrada por cultura; API externa fica para depois |
| Matching | **Regras configuráveis por tela já no MVP** |
| Parâmetros por empresa | Módulo de **Configurações**, editável pelo Admin do tenant |
| WhatsApp | Link `wa.me` com mensagem pré-preenchida |
| Storage de mídia | Cloudflare R2 (upload direto via URL assinada), organizada em galerias nomeadas |
| Mapas | MapLibre + tiles gratuitos |
| Qualidade | **TDD** — unitários mockados + integração + E2E |
| Runtime | **Node 22 LTS + pnpm**. Bun avaliado e recusado: o gerenciador de aplicações do aaPanel é construído em torno de Node/PM2, e sair dele custaria o SSL, o backup e o deploy que motivaram usar processo nativo |
| Hospedagem | API em **processo nativo no VPS com aaPanel**, Postgres em servidor próprio na **mesma rede privada**, build no **CI** com artefato enviado por SSH, frontend no **Netlify**, mídia no R2 |
| Empresa ativa | **Contexto da requisição**, via slug na URL (`/e/<empresa>/...`) — nunca filtro de módulo. Ver ADR 0002 |
| Venda | **Entidade própria** (`sales`), uma linha por fazenda vendida; a comissão pertence à venda, não à oportunidade. Ver ADR 0001 |
| Impostos | **Catálogo configurável por tenant** (nome + alíquota vigente); a comissão incide sobre o **valor líquido**, e cada venda congela as alíquotas da época |
| Precificação da fazenda | **Modo reais ou sacas** — guardada na natureza em que foi definida; o equivalente da outra é sempre calculado |
| Unidade de área | **Hectare no banco**, sempre. Alqueire é unidade de entrada e exibição, com o tipo (goiano, paulista, norte) explícito |
| Cotação | Identificada por **cultura + praça + data** — não existe cotação nacional única |
| Design System | O export do Claude Design é **referência visual e fonte dos tokens**, não código de produção. Ver ADR 0003 |
| Migrations entre fases | **Somente aditivas** (tabela nova, coluna nula). Reestruturação de tabela com dados de cliente exige plano explícito e janela |
| Specs | Uma por módulo em `docs/specs/<modulo>.md`, com issue do GitHub como unidade de tarefa |

Pendências de **negócio**, resolvíveis durante a Fase 1 (não bloqueiam o início):

- **Logo vetorial.** Os tokens de marca (cores, tipografia, espaçamento) já vêm resolvidos do export, mas não existe vetor do logotipo — só raster. O monograma não deve ser aproximado: enquanto o vetor não chegar, a marca aparece pelo componente `Wordmark`, só tipográfico.
- Valores iniciais dos vocabulários controlados: aptidões, culturas, status comercial, classificações, origens de lead, categorias de documento, nomes de galeria, etapas de venda. Todos viram cadastros configuráveis por tenant, mas precisam de uma carga inicial.
- **Alíquotas dos impostos vigentes** e as **praças de comercialização** que a Grand Vista usa como referência de cotação.
- **Tipo de alqueire padrão** do tenant, para entrada e exibição de área.

---

## Glossário

O escopo usa "oportunidade" com dois sentidos e "classificação" com três. Como esses termos viram nome de tabela, de coluna, de filtro e de rótulo na tela, ficam fixados aqui — e o registro de metadados de campo é a implementação desse glossário.

> **`CONTEXT.md`, na raiz, é o glossário canônico** — define o que cada termo *é*, sem detalhe de implementação, e é o que agentes leem antes de explorar o código. A tabela abaixo cumpre papel diferente e complementar: mapeia cada termo ao lugar onde ele **vive no código**. Termo novo entra nos dois.

| Termo | Significa | Onde vive |
|---|---|---|
| **Fazenda** | O imóvel captado pela corretora | `farms` |
| **Potencial de venda** | Quão promissora a fazenda é como ativo vendável. Atribuído na captação, existe antes de haver qualquer comprador | `farms.sales_potential` |
| **Prioridade** | Urgência com que a equipe deve trabalhar aquela captação | `farms.priority` |
| **Status comercial** | Situação da fazenda na carteira: disponível, em negociação, vendida, suspensa | `farms.commercial_status` |
| **Oportunidade** | Uma negociação entre um comprador e uma ou mais fazendas | `opportunities` |
| **Demanda** | Os critérios daquela negociação: área alvo, região, cultura, faixa de valor. Pré-preenchida do perfil de compra, depois editável | `opportunities` + tabelas de critério |
| **Etapa do funil** | Onde a negociação está nas 10 etapas: qualificação, visita técnica, due diligence… | `opportunities.stage_id` |
| **Probabilidade** | Chance de fechamento daquela negociação | `opportunities.probability` |
| **Fazenda candidata** | Fazenda em consideração numa oportunidade. Mutável e descartável, sem carga comercial. Rótulo na tela: "opção" | `opportunity_farms` |
| **Venda** | Fazenda efetivamente vendida dentro de uma oportunidade. Fato fechado, com termos congelados | `sales` |
| **Parcela da venda** | Prestação do pagamento da fazenda, com vencimento e valor | `sale_installments` |
| **Parcela da comissão** | Prestação da comissão, com valor previsto e valor recebido | `commission_installments` |
| **Preço pedido** | Valor em reais que o proprietário pede. Estático | `farms.asking_price` |
| **Avaliação** | Precificação em sacas por unidade de área. Valor móvel, acompanha a cotação | `farms.valuation_bags` + cultura |
| **Modo de precificação** | Qual das duas naturezas a fazenda usa: reais ou sacas | `farms.pricing_mode` |
| **Valor bruto** | Valor da venda antes dos impostos | `sales` |
| **Valor líquido** | Valor da venda após os impostos. **Base de cálculo da comissão** | `sales` |
| **Imposto** | Tributo sobre a venda, com nome e alíquota vigente. Hoje o Funrural | `taxes`, congelado em `sale_taxes` |
| **Praça** | Praça de comercialização que referencia a cotação | `trading_posts`, `crop_quotes` |
| **Classificação do cliente** | Nota do contato como comprador | `contacts.classification` |
| **Grau de qualificação** | Maturidade do comprador no processo consultivo | `buyer_profiles.qualification_level` |
| **Compatibilidade** | Aderência calculada, de 0 a 100%, entre uma fazenda e um comprador | Calculada, não persistida |
| **Corretor interno** | Pessoa da equipe, com login no sistema | `users` |
| **Corretor responsável** | O corretor interno dono daquela fazenda ou negociação | `farms.responsible_user_id`, `opportunities.responsible_user_id` |
| **Corretor externo** | Parceiro sem acesso ao sistema, que traz fazenda ou comprador | `contacts` com papel `corretor_externo` |
| **Perfil de compra** | Como aquele comprador compra: ticket, urgência, formas de pagamento, capacidade | `buyer_profiles` |
| **Perfil de acesso** | Pacote de permissões atribuível a usuários | `access_profiles` |
| **Perfil de acesso Corretor** | Um dos perfis de acesso semeados. Não implica responder por carteira | `access_profiles` |
| **Indicador** | Quem trouxe um contato ou uma fazenda. Pode ser interno ou externo | `referral_links.referrer` |
| **Participante da comissão** | Quem recebe parte da comissão. Pode ser interno ou externo | `commission_members.party` |

Os dois pares que mais se confundem: **potencial de venda** é da fazenda e não depende de comprador algum, enquanto **oportunidade** só existe quando há comprador; **status comercial** é da fazenda e resume todas as suas negociações, enquanto **etapa do funil** pertence a uma negociação específica. Uma fazenda com status "em negociação" pode ter três oportunidades em etapas diferentes.

O escopo escreve "Classificação da oportunidade" no cadastro de fazendas; é o que aqui chamamos de **potencial de venda**. A troca de nome vale para banco, API e tela.

Um terceiro par, que só apareceu quando a venda virou entidade: **fazenda candidata** e **venda** convivem na mesma oportunidade e nunca se confundem na operação, mas se confundiriam no banco. Candidata é opção apresentada — entra e sai conforme o corretor trabalha. Venda é fato fechado com peso contratual. É o que a ADR 0001 registra.

E um quarto, do lado do dinheiro: **preço pedido** é o que o proprietário pede, **valor potencial** é a estimativa que a oportunidade carrega durante a negociação, e **valor da venda** é o efetivo no fechamento. Só o último serve de base para comissão e para o "Valor Vendido" do painel.

### As três acepções de "corretor"

Sozinha, a palavra é ambígua e nunca deve aparecer assim em código nem em texto de UI. São três coisas que convivem na mesma tela de oportunidade:

- **Corretor interno** é um `user`. Quando responde por uma fazenda ou negociação, é o **corretor responsável** — nome do papel, não de uma entidade nova.
- **Corretor externo** é um `contact` com papel próprio. Não tem login, não aparece em seletor de responsável, e pode acumular papéis: o parceiro que indica um comprador hoje pode ser o comprador de amanhã, no mesmo cadastro.
- **Perfil de acesso Corretor** é apenas um pacote de permissões. Um Gestor pode ser corretor responsável por fazendas; um usuário com esse perfil de acesso pode não responder por nenhuma. Perfil de acesso e responsabilidade são eixos independentes — confundi-los levaria a regra de permissão errada.

**Indicador** e **participante da comissão** são os dois lugares onde interno e externo aparecem lado a lado, e por isso ganham nome próprio: ambos os campos são polimórficos (`user` ou `contact`) e nenhum deles se chama "corretor". Quem indica não necessariamente recebe comissão, e quem recebe não necessariamente indicou — as duas listas são montadas de forma independente.

### "Perfil" nunca aparece sozinho

Mesma armadilha, outra palavra. **Perfil de compra** descreve o comportamento comercial de um contato; **perfil de acesso** descreve o que um usuário pode fazer no sistema. Não têm relação alguma, e convivem na mesma aplicação.

A regra é escrever sempre com o qualificador — em nome de tabela, de rota, de componente, de permissão e de rótulo na tela. "Perfil" sozinho é ambíguo e não deve passar em revisão: uma tela chamada "Perfis" ou uma rota `/perfis` não diz qual dos dois é.

Detalhe de implementação: a tabela `buyer_profiles` agrupa todas as características comerciais do comprador, enquanto o atributo que o escopo chama especificamente de "Perfil de compra" (investidor, produtor, especulador…) é a coluna `purchase_profile` dentro dela. O rótulo na tela é "Perfil de compra" nos dois casos porque, do ponto de vista do usuário, é a mesma seção da ficha.

---

## Stack

**Runtime:** Node 22 LTS
**Backend:** Hono + Drizzle ORM + PostgreSQL 16+ + Zod
**Frontend:** React + Vite + Tailwind + shadcn/ui (Radix) + TanStack Query + React Hook Form + MapLibre
**Auth:** Better Auth (organizations plugin)
**Storage:** Cloudflare R2 (S3-compatible)
**Testes:** Vitest (unitários e integração) + Playwright (E2E)
**Monorepo:** pnpm workspaces + Turborepo

Sobre `shadcn/ui`: não é dependência, é código copiado para dentro de `packages/ui` — são componentes escritos sobre os primitivos do **Radix**, estilizados com Tailwind, dos quais passamos a ser donos. É o que permite reestilizar para a marca editando arquivo nosso, sem brigar com biblioteca. O Radix entrega o que é tedioso e falha em silêncio: foco preso em diálogo, retorno de foco, navegação por teclado, ARIA, posicionamento que desvia da borda. Ver ADR 0003 para a divisão entre o que vem do shadcn, o que é escrito à mão e o que atravessa do export.

O RPC do Hono (`hc<AppType>`) exporta os tipos das rotas direto para o cliente React — sem geração de código, sem client duplicado. Zod valida na borda HTTP, alimenta os formulários via `@hookform/resolvers` e **gera a documentação OpenAPI** exigida pelo escopo, a partir dos mesmos schemas.

### Estrutura

```
crm/
├── apps/
│   ├── api/          # Hono + Drizzle + Better Auth + OpenAPI
│   └── web/          # React + Vite + Design System
└── packages/
    ├── db/           # schema Drizzle + migrations (fonte única da verdade)
    ├── shared/       # schemas Zod, tipos, metadados de campo, constantes
    └── ui/           # Design System: componentes, tokens, documentação
```

Cada módulo de negócio é uma pasta autocontida em `apps/api/src/modules/<nome>` (rotas, serviço, schemas, testes) registrada no router raiz, com o correspondente em `apps/web/src/modules/`. Adicionar um módulo não deve exigir tocar em nenhum outro — é o que o escopo pede ao falar em "possibilidade de criação de novos módulos".

Cada pasta de módulo carrega um `CLAUDE.md` curto — quais tabelas o módulo possui, onde está a spec dele, convenções locais. É carregado automaticamente quando um agente trabalha ali, e é ponteiro, não spec.

---

## Infraestrutura e deploy

VPS Linux administrado por **aaPanel**, com a API rodando como **processo nativo** (não container). A escolha é deliberada: o painel resolve certificado SSL, backup e deploy por webhook, e é o que motivou não usar Docker em produção. O Postgres fica em **servidor próprio, na mesma rede privada** — hoje os dois estão em regiões distintas falando pela internet, o que impõe latência de ida e volta a cada transação, e a migração para a mesma rede acontece **antes da Fase 0** para que o pipeline seja montado uma vez só, contra o endereço definitivo.

**Build no CI, nunca no servidor.** O GitHub Actions roda testes, compila e envia o artefato pronto por SSH; o webhook do painel só reinicia o processo. O VPS é compartilhado com outros projetos, e build de monorepo não deve competir por CPU e memória com eles. De brinde: build que falha nunca chega a tocar produção, e o servidor não precisa das dependências de desenvolvimento.

**Frontend no Netlify**, com `base = "apps/web"` e instalação a partir da raiz do workspace — monorepo pnpm não é obstáculo. Mídia no R2.

**Postgres 18**, instalado no mesmo servidor da aplicação e escutando apenas em `localhost` — sem porta exposta, sem SSL na conexão, sem regra de firewall. A mesma major version vale no local e no CI, fixada por tag explícita no Docker Compose (nunca `latest`).

A instância é **compartilhada com outros projetos** do mesmo servidor, o que impõe dois cuidados. O isolamento é no nível do banco, e como o Postgres concede `CONNECT` a todo papel autenticado por padrão, o banco do CRM revoga `CONNECT` de `PUBLIC` e concede apenas a `crm_owner` e `crm_app` — sem isso, o papel de outra aplicação conseguiria conectar e enumerar o schema. E o `max_connections` é dividido entre os projetos, então o pool da API é dimensionado conservadoramente (ordem de 10 conexões), não no padrão da biblioteca.

**Sem homologação na Fase 0** — local direto para produção, que é o que a fase pede e ninguém está usando ainda. O ambiente de homologação nasce ao fim da Fase 1, quando a Grand Vista começa a usar de verdade: a partir daí, subir migration quebrada na produção do cliente é risco de outra natureza. É o mesmo pipeline apontando para outro diretório e outro banco.

**Backups:** o mecanismo do aaPanel cobre o servidor da aplicação, não o servidor de banco, que é máquina separada. O Postgres precisa de estratégia própria — `pg_dump` agendado ou o que a provedora oferecer — e isso entra na Fase 5 junto do resto do endurecimento.

---

## Design System

Requisito de primeira classe, não acabamento. `packages/ui` concentra tokens (cores da marca, tipografia, espaçamento, raios), os primitivos shadcn customizados e os componentes compostos do domínio. Documentado em Storybook, com cada componente exibindo variantes e estados.

### O export do Claude Design

`design-system-export/` é o design system da Grand Vista produzido no Claude Design: 170 arquivos com 237 tokens CSS, 31 componentes React, 22 páginas HTML de referência visual e dois kits de tela. Está versionado no repositório — entrou antes de qualquer triagem justamente para que a reorganização seja reversível.

É **referência visual e fonte dos tokens, não código de produção** (ADR 0003). A divisão:

| Camada | Origem |
|---|---|
| Tokens | Copiados do export quase literalmente — valor de token é dado, não código |
| Primitivos interativos (Dialog, Select, Combobox, DatePicker, Tabs, Switch, Checkbox, Popover) | shadcn, reestilizado com esses tokens |
| Apresentação e domínio (`FarmCard`, `StatCard`, `CompatibilityGauge`, `Wordmark`, `SidebarNav`, `TopBar`, `StageStepper`, `Badge`, `Tag`, `ProgressBar`, `EmptyState`, `AuditTimeline`) | Escritos à mão em Tailwind, usando o `.jsx` do export como referência visual e o `.prompt.md` de cada um como especificação de comportamento |
| `components/*.jsx` do export | Nunca importados |

Os estilos inline do export não atravessam: não suportam media query, container query, pseudo-classe nem tema escuro — e o próprio kit `crm-v2` do export abandonou inline em favor de um arquivo CSS.

Nomes são reconciliados com o glossário **na importação**, enquanto nada os consome: `MatchScore` → `CompatibilityGauge`, `DealCard` → `OpportunityCard`, `ActivityTimeline` → `AuditTimeline`. `ChecklistItem`/`ChecklistPanel` e `PipelineColumn`/`KanbanBoard` permanecem como dois níveis legítimos (item e painel, coluna e quadro), não renomeações.

O kit `ui_kits/crm-v2` é declarado no próprio README como o padrão do sistema e carrega trabalho que não está nos componentes: layout responsivo com container queries em três faixas, comportamento mobile (tab bar flutuante, tabela virando card, kanban virando seletor de etapa, drawer virando bottom sheet) e o padrão de superfície. É **insumo obrigatório de leitura** para as specs de tela das Fases 1 e 2 — essas decisões viram texto na spec do módulo, em vez de ficarem num HTML que alguém precisa abrir e interpretar. O kit `ui_kits/site` é o site público de captação, fora de escopo, e fica apenas arquivado.

Os 31 arquivos `.prompt.md` do export, um por componente, descrevem a intenção de cada um e são matéria-prima direta para a seção "Telas e componentes" das specs.

A config `_adherence.oxlintrc.json` do export (formato **oxlint**) não é integrada a uma config existente — ela *vira* a config de lint do projeto, que hoje não existe.

Componentes compostos que nascem cedo e são reaproveitados por todos os módulos:

`DataTable` (filtros, ordenação, paginação, exportação) · `Pagination` · `AsyncCombobox` · `DateRangePicker` · `EntityForm` (validação Zod, layout em seções) · `MediaUploader` · `DocumentManager` · `ContactPicker` / `FarmPicker` / `MunicipalityPicker` · `ReferralChainEditor` · `CommissionEditor` · `AuditTimeline` · `KanbanBoard` · `ChecklistPanel` · `StatCard` · `CompatibilityGauge` · `MoneyInput` / `AreaInput` / `PercentInput`

Três deles carregam o resto do sistema e por isso ganham atenção especial:

- **`AsyncCombobox`** — busca na API conforme o usuário digita, com debounce, estados de carregando/vazio/erro, seleção única ou múltipla, limpar seleção, desmarcar item já escolhido, valor inicial hidratado por ID e paginação incremental do resultado. É a base de `ContactPicker`, `FarmPicker`, `MunicipalityPicker` e de todo seletor de vocabulário controlado — escrever isso uma vez, bem feito, elimina dezenas de variações espalhadas.
- **`Pagination`** — componente isolado, não acoplado ao `DataTable`, para servir também a listas em card, galerias e resultados de matching.
- **`DateRangePicker`** — seleção de período atravessando vários meses, com dois calendários lado a lado e atalhos (mês atual, últimos 30 dias, trimestre, ano), no espírito do AntD. Usado nos filtros de relatório e do dashboard.

Os três **não existem no export** e são os que mais trabalho exigem. Os dois primeiros ganham base no shadcn: Command + Popover para o combobox, react-day-picker para o calendário. A menção ao AntD aqui é sobre o padrão de UX do seletor de período dele, não sobre adotar a biblioteca — AntD foi avaliado e recusado (ADR 0003).

Regra prática: um módulo novo deve consumir mais componentes do que criar. Quando precisar de algo novo, a pergunta é se cabe em `packages/ui` — se serve a dois módulos, cabe.

### Metadados de campo (DRY)

Um registro único em `packages/shared` mapeia cada campo de cada entidade ao seu rótulo em português, tipo e formatação (`buyer` → "Comprador", `total_area_ha` → "Área total (ha)", `sales_potential` → "Potencial de venda"). Esse registro alimenta ao mesmo tempo os rótulos dos formulários, os cabeçalhos das tabelas, os filtros de relatório e **a tela de histórico de alterações** — o usuário nunca vê nome de coluna do banco. Um rótulo muda em um lugar só.

É também onde o glossário deixa de ser documentação e vira código: o nome que o usuário lê sai daqui, então divergência entre glossário e tela não sobrevive.

---

## Arquitetura multi-tenant e segurança

Quatro camadas de controle, do mais amplo ao mais fino:

1. **Tenant (RLS).** Toda tabela de negócio carrega `tenant_id`. Cada transação executa `SET LOCAL app.tenant_id` e as policies do Postgres filtram automaticamente. Se uma query esquecer o `WHERE tenant_id`, o banco não vaza dados de outro cliente. É o ponto mais crítico do projeto — vazamento entre tenants é a pior falha possível num SaaS — e entra na Fase 0, antes de qualquer feature, com testes dedicados.
2. **Permissão.** Middleware Hono valida a rota contra as permissões efetivas do usuário — a união das permissões dos perfis vinculados a ele.
3. **Escopo de dados.** Cada perfil define, por módulo, se enxerga apenas os próprios registros ou os de todos. "Próprios" significa ser o **corretor responsável** pelo registro — não ter o perfil Corretor. Os dois eixos são independentes: um Gestor pode responder por fazendas, e alguém com o perfil Corretor pode não responder por nenhuma. Cláusula reutilizável aplicada nas listagens e nos guards de detalhe.
4. **Comissão.** Sem permissão de ver comissão alheia, o usuário enxerga apenas a própria linha numa negociação — nunca a dos colegas nem o total. Filtro aplicado na camada de serviço, não na UI: a API nunca devolve o que o usuário não pode ver.

### Dois papéis no banco — o RLS depende disso

**O Postgres não aplica RLS ao dono da tabela nem a superusuário.** Se a API conectar com o usuário que criou o banco, todas as policies são ignoradas em silêncio: as queries funcionam, os testes de feature passam, e o isolamento entre empresas simplesmente não existe. É a pior falha possível neste sistema, e ela não dá erro — só vaza.

Por isso o banco tem **dois papéis distintos**:

- **`crm_owner`** — dono do schema, roda as migrations. Não é usado pela aplicação.
- **`crm_app`** — o que a API usa. Não é superusuário, não é dono de tabela nenhuma, não tem `BYPASSRLS`, e só recebe `SELECT`/`INSERT`/`UPDATE`/`DELETE` nas tabelas de negócio. Está sujeito às policies como qualquer um.

Como reforço, toda tabela de negócio recebe `ALTER TABLE ... FORCE ROW LEVEL SECURITY`, que aplica as policies **inclusive ao dono** — assim, se alguém algum dia apontar a aplicação para o papel errado, as policies continuam valendo.

Nunca usar `crm_owner`, `postgres`, nem qualquer papel com `BYPASSRLS` na string de conexão da aplicação. O teste de isolamento da Fase 0 conecta como `crm_app` justamente para que ele prove algo: rodando como dono, ele passaria sem o RLS fazer nada.

### Empresa ativa: contexto, não filtro

A empresa ativa vem do **slug na URL** (`/e/<empresa>/fazendas/123`), e a URL **pede** uma empresa — nunca autoriza. O fluxo por requisição é: resolver o slug, verificar o vínculo do usuário logado, e só então aplicar o `SET LOCAL`. Sem vínculo, **404 e não 403** — um 403 confirmaria que aquela empresa existe, permitindo varrer slugs e descobrir a carteira de clientes da plataforma. Na tela isso não precisa ser hostil: "Você não tem acesso a esta empresa, ou ela não existe", seguido da lista das empresas que ele acessa.

Não existe seletor de empresa dentro dos filtros de nenhum módulo. Um filtro de empresa implicaria que a consulta pode atravessar empresas e que só o filtro a contém — exatamente a consulta que vaza. Troca-se o contexto num único lugar, na topbar, e vale para toda a aplicação. Quem tem acesso a uma empresa só nunca vê seletor algum; quem tem a várias define a empresa padrão no perfil, pré-selecionada no login. Ver ADR 0002.

Consulta que agrega entre empresas — uma visão da plataforma inteira — não é filtro afrouxado nos módulos, e sim superfície de relatório separada, com caminho de acesso próprio.

### Requisições sem tenant

O wrapper de transação **exige** tenant e estoura erro se não houver: consulta de negócio sem tenant definido é bug de isolamento, não caso de uso. Três exceções passam por um caminho explícito e nominal (`semTenant()`), fácil de auditar por busca no código — se um dia aparecer dentro de um módulo de negócio, salta aos olhos na revisão:

- **login**, que ainda não tem tenant
- **script de CLI** que provisiona tenant novo, que escreve antes de o tenant existir
- **super admin** atravessando tenants — e aqui o `SET LOCAL` recebe o tenant que ele está inspecionando, nunca um curinga, para que ele veja uma empresa por vez como qualquer usuário e nenhuma consulta misture dados de duas corretoras

### Tabelas de autenticação ficam fora do RLS

As tabelas do Better Auth (usuário, sessão, conta, organização e o vínculo usuário↔tenant) **não** carregam policy por tenant, e isso não é conveniência: o vínculo é justamente o que *define* a pertinência, então filtrá-lo por tenant seria circular — para saber a quais empresas o usuário pertence, o banco precisaria já saber em qual empresa ele está. O login quebraria. O isolamento dessas tabelas é responsabilidade da camada de aplicação.

Para que a exceção seja declarada e não acidental, a Fase 0 entrega um **teste que varre o schema e falha o CI** se existir tabela de negócio sem `tenant_id` ou sem policy ativa, com a lista de tabelas de auth como exceção explícita. É o que impede que, daqui a seis meses e vinte tabelas, alguém crie uma sem policy e ninguém perceba — que é como vazamento entre tenants acontece na prática.

### Perfis de acesso configuráveis

O sistema não tem papéis fixos em código. Existe um **catálogo de permissões granulares** (`fazendas.criar`, `oportunidades.editar`, `comissao.ver_de_terceiros`, `configuracoes.gerenciar`…), e cada tenant monta seus próprios perfis de acesso combinando essas permissões, definindo também quais telas cada um acessa e qual o escopo de dados por módulo. Um usuário pode ter vários perfis de acesso vinculados; vale a união das permissões.

Admin, Gestor e Corretor entram como perfis de acesso **semeados** na criação do tenant — cobrem o uso desde o primeiro dia, e o administrador da empresa depois ajusta, cria novos ou remove conforme a corretora trabalha.

Decisão de sequenciamento importante: o *motor* é granular desde a Fase 0, mas a *tela* de administração de perfis de acesso só entra na Fase 3. Como as verificações já consultam permissões desde o início, essa tela é apenas um CRUD sobre estruturas que já existem — não há retrabalho, e o marco dos 3 meses fica protegido.

### Permissões de escopo de plataforma

Perfil de acesso é, por definição, de um tenant — então não pode conceder poder sobre outros tenants. Para o que é administração da plataforma (gerir empresas, vincular usuários a empresas, ver todas as empresas), o catálogo ganha um **escopo de plataforma**: permissões como `empresas.gerenciar` e `empresas.ver_todas`, que vivem fora dos perfis de tenant.

Na Fase 0, só o `is_super_admin` passa por essas permissões. O papel visível de administrador da plataforma — o **AdminMaster**, que gere empresas pela interface — é adiado: hoje o dono do negócio e o desenvolvedor são a mesma pessoa, e o papel só existe de verdade quando houver licenciamento para outras corretoras. Quando existir, é um vínculo novo apontando para permissões que já estarão lá: aditivo, sem reestruturação.

A distinção importa porque os dois mecanismos não podem ser o mesmo: o AdminMaster é um papel **visível** e normal, enquanto o super admin é invisível por requisito.

### Super Admin

Flag `is_super_admin` na tabela de usuários, marcada exclusivamente por script de CLI — não há rota, tela ou payload que a altere. Quem a tem passa por todas as verificações de permissão e escopo, inclusive entre tenants.

O sigilo é requisito, não detalhe: a flag é removida de toda serialização de usuário, e as listagens de equipe, os seletores de responsável e os relatórios exibem o super admin como um usuário comum, com os perfis que estiverem de fato vinculados a ele. Isso vira teste de integração — nenhuma resposta da API pode conter o campo, para nenhum papel.

### Auditoria

O escopo pede "logs de auditoria" como requisito geral e "histórico de alterações" como campo de fazenda — é o mesmo mecanismo. Tabela `audit_log` genérica (`tenant_id`, entidade, `entity_id`, campo, valor anterior, valor novo, usuário, timestamp), alimentada por um wrapper de escrita no Drizzle, para não depender de o desenvolvedor lembrar de registrar. A exibição usa os metadados de campo para mostrar rótulo legível e valor formatado.

---

## Modelo de dados

> **`docs/specs/modelo-de-dados.md` é o modelo canônico** — todas as tabelas das seis fases, com colunas, tipos, restrições, índices e a lista nominal do que fica fora do RLS. A visão abaixo é o resumo por área, útil para orientação; divergência entre os dois se resolve pelo arquivo de spec.
>
> Sete tabelas que esta seção descreve em prosa e o modelo nomeia: `profile_data_scopes` (escopo de dados por módulo), `user_platform_permissions` (estrutura do AdminMaster, vazia na Fase 0), `opportunity_regions` e `opportunity_crops` (critérios da demanda), `due_diligence_templates` e `due_diligence_template_items` (os cinco checklists configuráveis), e `sessions` (Better Auth).

**Acesso e configuração**
- `tenants`, `users` (com `is_super_admin`), `memberships` (vínculo usuário↔tenant) — Better Auth
- `permissions` — catálogo de permissões granulares (módulo + ação), definido em código e sincronizado por migration
- `access_profiles` — perfis criados por tenant, com escopo de dados por módulo
- `profile_permissions` — permissões de cada perfil
- `user_profiles` — vínculo N:N entre usuário e perfis
- `tenant_settings` — parâmetros por empresa: limiares de inércia (dias para cliente esquecido, negociação estagnada, proprietário sem retorno), comissão padrão, moeda, formatos
- `audit_log` — histórico de alterações genérico
- `custom_field_defs` — campos personalizados por tenant
- `matching_rules` — pesos e critérios de compatibilidade, configuráveis
- `crop_quotes` — cotação da saca por **cultura + praça + data**. Não existe cotação nacional única: duas fazendas avaliadas em 7.000 sacas por alqueire, uma em Rio Verde e outra em Sorriso, valem valores diferentes em reais no mesmo dia
- `trading_posts` — praças de comercialização (vocabulário configurável)
- `taxes` — impostos incidentes na venda, com nome e alíquota vigente. Hoje o caso real é o Funrural, mas o catálogo é genérico de propósito: o governo pode criar outros, alterar alíquotas ou extinguir o atual, como já fez. Não há histórico de vigência próprio — o `audit_log` registra as mudanças de alíquota, e cada venda congela o que valia na época
- `municipalities` — municípios brasileiros com estado e região, carga inicial do IBGE
- Vocabulários configuráveis: `aptitudes`, `crops`, `commercial_statuses`, `lead_sources`, `document_categories`, `gallery_types`, `trading_posts`, `sale_statuses`

**Significado de sistema nos vocabulários.** Todo vocabulário que o tenant pode criar e renomear livremente carrega, além do nome, um **significado de uma lista fechada** — para venda: `em_andamento`, `concluida`, `cancelada`; para o funil: `aberta`, `ganha`, `perdida`. A empresa renomeia, reordena e cria quantas entradas quiser; cada uma aponta para exatamente um significado. Sem isso o sistema perde a capacidade de calcular: "Valor Vendido" precisa saber quais etapas contam como concluída, "Tempo Médio para finalizar venda" precisa saber onde termina, e comissão devida só vale sobre venda concluída. Vale igual para `pipeline_stages`, `commercial_statuses` e `sale_statuses`.

**Contatos**
- `contacts` — PF/PJ, dados de contato, classificação, origem do lead e do relacionamento, observações estratégicas
- `contact_roles` — `comprador`, `proprietario` e/ou `corretor_externo` (acumuláveis)
- `buyer_profiles` — **perfil de compra**, 1:1 opcional: ticket médio e máximo, faixa de hectares, patrimônio estimado, capacidade de investimento, urgência, grau de qualificação e `purchase_profile` (investidor, produtor, especulador…)
- `buyer_regions`, `buyer_crops`, `buyer_payment_methods` — interesses e formas de pagamento aceitas (múltiplas)

**Cadeia de indicação**
- `referral_links` — quem trouxe quem, em N níveis. Aponta para um sujeito (contato ou fazenda) e guarda a posição na cadeia e o **indicador**, polimórfico: `referrer_user_id` ou `referrer_contact_id`, exatamente um dos dois preenchido.

Modela literalmente "o Pedro veio pelo João, que pegou com o Sebastião" e "essa fazenda veio pelo corretor Carlos, que soube pelo Antônio". Vale para os dois lados, comprador e vendedor, e não depende de o proprietário estar identificado. Renderizada e editada pelo `ReferralChainEditor`.

**Fazendas**
- `farms` — identificação, município, **proprietário opcional** (`owner_contact_id`), corretor responsável (`responsible_user_id`), áreas total e útil **em hectares**, aptidão, solo, topografia, água, disponibilidade hídrica, potencial de irrigação, distâncias de rodovias e armazéns, produtividade histórica e potencial, infraestrutura, situação documental, status comercial, **potencial de venda** (`sales_potential`), prioridade, resumo técnico, diferenciais, coordenada aproximada, praça de referência (`trading_post_id`, normalmente derivada do município mas sobrescrevível), `custom_fields` (JSONB)
- Precificação na mesma tabela, com discriminador `pricing_mode`: no modo `reais`, `asking_price`; no modo `sacas`, a quantidade (`valuation_bags`), a unidade (por alqueire ou por hectare) e a cultura de referência. O equivalente em reais de uma avaliação em sacas é **sempre calculado**, nunca persistido, a partir da cotação vigente da praça da fazenda. Valor por hectare, por hectare útil e faixa de valor são derivados
- `farm_galleries` — agrupamento de mídia por tipo nomeado (Solo, Aérea, Sede…), com os nomes vindos de `gallery_types`
- `farm_media` — fotos e vídeos no R2, vinculados a uma galeria
- `farm_documents` — anexos vinculados a `document_categories`

**Comercial**
- `opportunities` — negociação, probabilidade, valor potencial, etapa, corretor responsável (`responsible_user_id`), mais os critérios da **demanda**: área alvo, faixa de valor e, em tabelas de junção, regiões e culturas. Nascem pré-preenchidos do perfil de compra do contato e depois são editáveis — o mesmo investidor pode ter uma oportunidade buscando soja em Goiás e outra buscando pecuária no Mato Grosso, e o perfil permanente não representa as duas ao mesmo tempo
- `opportunity_farms` — **fazendas candidatas**: junção N:N, mutável e descartável, sem carga comercial
- `pipeline_stages` — as 10 etapas, configuráveis por tenant
- `activities` — visitas, reuniões, ligações, retornos, próxima atividade
- `due_diligence_items` — checklists jurídico, ambiental, fundiário, fiscal e documental

**Venda**
- `sales` — uma linha por fazenda efetivamente vendida dentro de uma oportunidade: valor bruto, valor líquido, data, status (de `sale_statuses`, configurável), **área vendida** e observação em texto livre. Venda parcial é exceção na operação (cerca de 3 em 100), então não há entidade de desmembramento: a área remanescente da fazenda é ajustada pelo corretor e a auditoria registra a mudança
- `sale_taxes` — impostos e alíquotas **congelados** no fechamento daquela venda. Atualizar o catálogo não reescreve retroativamente venda nenhuma
- `sale_installments` — **parcelas da venda**: vencimento, valor, se foi liquidada. Escopo contido — é o cronograma que a comissão referencia, não um contas-a-receber completo

O proprietário informa o preço **bruto**; a comissão incide sobre o **líquido**, após subtrair os impostos. Bruto e líquido são campos explícitos, nunca inferidos — o contrato precisa dizer expressamente qual dos dois é a base, então o sistema não adivinha.

**Comissão**
- `commission_groups` — grupo dentro de uma **venda** (não da oportunidade), com nome e **% sobre o valor líquido**
- `commission_members` — **participante da comissão**, polimórfico como o indicador (`party_user_id` ou `party_contact_id`), com % próprio opcional
- `commission_installments` — **parcelas da comissão**: valor **previsto** e valor **recebido**, com data da baixa e observação em texto livre de como foi efetivamente pago. Na vida real a comissão é paga em dinheiro, em sacas de soja, em permuta de bens, imóveis ou veículos — o sistema trabalha sempre em reais e registra a forma real em texto. Os dois valores divergem quando o pagamento foi combinado em sacas e pago conforme a cotação do dia, e é essa divergência que o administrador precisa enxergar

Regra: a comissão é obrigação do vendedor — e é por isso que ela pertence à venda, não à oportunidade. Cinco fazendas fechadas na mesma oportunidade são cinco proprietários, cinco vendedores e cinco acordos distintos, cada um possivelmente com cadeia de indicação e participantes próprios (ADR 0001). A comissão total da venda é a soma dos % dos grupos. Dentro de cada grupo, a divisão é igual entre os membros por padrão; informar um % específico para um membro sobrescreve o cálculo, e o sistema avisa quando a soma do grupo não fecha 100%. Toda a aritmética fica num serviço puro e testável, isolado de HTTP e banco — ele recebe um valor total e distribui, então passar a ser invocado por venda em vez de por oportunidade não o altera.

Valores monetários em `numeric`, nunca `float`. **Áreas sempre em hectares** (`numeric`): alqueire é unidade de entrada e exibição, e não é medida única — o goiano/mineiro tem 4,84 ha, o paulista 2,42 ha, o do norte 2,72 ha, então informar área em alqueires exige dizer qual. O corretor digita em alqueires, o sistema converte e guarda hectares; a unidade de exibição preferida é parâmetro do tenant. Sem unidade única, matching por faixa de área e agregação regional deixam de ser confiáveis.

Campos personalizados em `JSONB` com definições tipadas por tenant: evita EAV, que destruiria a legibilidade das queries, e o Postgres indexa `JSONB` com GIN quando precisar filtrar. Município como tabela referenciada, não texto livre — sem isso o matching por região não é confiável e os relatórios regionais não agregam.

---

## Matching configurável

Requisito central, exigido nas duas direções: ao cadastrar uma fazenda o sistema retorna compradores compatíveis; na ficha do comprador aparecem as fazendas aderentes.

**O resultado de fazenda → compradores é uma lista de demandas, não de compradores.** A busca passa primeiro pelos critérios das **oportunidades em aberto** e usa o perfil de compra apenas como base para contatos que não têm nenhuma oportunidade aberta, exibindo essa diferença visualmente em dois blocos. A razão é a ação seguinte do corretor: ele vai mandar a fazenda para o João *na demanda de Rio Verde*, e esse envio vincula a fazenda a uma oportunidade específica. Se a lista colapsar por contato, ele perde qual demanda casou. Um contato com duas demandas aparece duas vezes, com notas diferentes, e a tela agrupa por contato para não poluir. No bloco de perfil a ação é outra — abrir uma oportunidade, não somar a uma existente.

Com área alvo na demanda e as vendas já fechadas, cai de graça uma mecânica que a operação pede: a tela mostra "720 de 1.000 ha atendidos" e o matching passa a sugerir fazendas que caibam nos 280 que faltam.

Query SQL parametrizada cruzando região, faixa de hectares, faixa de valor, aptidão e culturas, com pontuação ponderada. Os pesos e critérios ativos vêm de `matching_rules`, editáveis numa tela de administração — o escopo pede "regras previamente configuradas".

O resultado é uma **compatibilidade de 0 a 100%**, exibida pelo `CompatibilityGauge`: um anel de progresso circular colorido por faixa (alta, média, baixa), com o percentual ao centro. Ao lado, a lista dos critérios que bateram e dos que não bateram, para o corretor entender de onde veio a nota em vez de confiar num número opaco. O mesmo componente serve a lista de matching, a ficha da fazenda e a ficha do comprador.

O percentual sai da soma ponderada dos critérios atendidos dividida pelo peso total dos critérios ativos — assim a nota continua fazendo sentido mesmo quando o administrador liga ou desliga critérios.

Sem serviço externo nem ML: SQL sobre índices resolve com folga o volume esperado, e a regra fica auditável. A arquitetura de API deixa espaço para recomendação preditiva num contrato futuro, como o escopo prevê.

---

## Estratégia de testes (TDD)

Teste escrito antes da implementação, exercitando **o mesmo código que roda em produção** — sem caminho alternativo, sem regra duplicada para teste. Onde há divergência entre o que o teste valida e o que produção executa, o teste não vale nada.

- **Unitários (Vitest).** Regras de negócio puras, com dependências mockadas: rateio de comissão, pontuação de matching, cálculo do valor em sacas, montagem da cadeia de indicação, limiares de inércia. Essas funções vivem em serviços sem I/O, o que as torna triviais de testar e é o principal motivo de separá-las das rotas.
- **Integração (Vitest + Postgres real).** Rotas HTTP contra banco em container, migrations aplicadas do zero. Cobre RLS, permissões por papel, visibilidade de comissão e auditoria — coisas que mock nenhum consegue provar.
- **E2E (Playwright).** Fluxos críticos ponta a ponta no navegador.

Cobertura alta nos serviços de domínio, sem perseguir 100% em código de infraestrutura. Nenhuma feature é considerada pronta sem teste.

---

## Especificação e trabalho com agentes

O desenvolvimento é solo, com agentes distintos pegando tarefa por tarefa. Para que um agente implemente um módulo **sem depender do histórico de conversa que produziu as decisões**, três coisas precisam ser verdade da spec dele: ser **autossuficiente** (o agente lê `CLAUDE.md` + `CONTEXT.md` + as ADRs citadas + a própria spec, e nada mais), ser **fechada** (dizer explicitamente o que está fora de escopo, para o agente não "melhorar" o que não foi pedido) e ter **critérios de aceite verificáveis** — a lista de testes que provam que acabou, que é o que o TDD já exige.

**Spec no repositório, tarefa na issue.** As duas coisas cumprem papéis diferentes: a spec é o contrato durável, versionado e revisável em pull request, que evolui junto do código; a issue é a atribuição, que fecha quando o trabalho termina. `docs/agents/issue-tracker.md` diz que "issues e specs vivem como issues do GitHub" — desviamos nessa metade, porque issue não entra em PR, não tem diff revisável e divergiria do código sem deixar rastro.

Cada `docs/specs/<modulo>.md` segue um esqueleto fixo:

```
Objetivo · Vocabulário (termos do CONTEXT.md que usa) · Decisões que
governam (links de ADR) · Modelo de dados (tabelas e colunas que este
módulo possui) · Regras de negócio · Contratos de API · Telas e
componentes (o que consome de packages/ui, o que cria) · Critérios de
aceite (lista de testes) · Fora de escopo · Depende de (outras specs)
```

A issue do GitHub aponta para a spec e para a seção, usando as dependências nativas que o `issue-tracker.md` já documenta para estabelecer a ordem.

---

## Roadmap

### Fase -1 — Modelo de dados completo (antes da Fase 0)

Todas as tabelas e colunas das seis fases desenhadas **de uma vez**, antes da primeira migration. Não é perfeccionismo: é o que garante que as migrations entre fases sejam só aditivas (tabela nova, coluna nula) e nunca reestruturação de tabela com dados de cliente dentro. É também pré-requisito das specs — a spec de Contatos não pode ser escrita antes do modelo fechar, senão ela inventa colunas que Fazendas também precisa.

Em seguida, as specs por módulo escritas contra esse modelo.

### Fase 0 — Fundação (semanas 1–2)

Monorepo pnpm com Turborepo, Docker Compose com Postgres 16+, Drizzle com migrations, Better Auth com organizations, **motor de permissões granulares** com os perfis de acesso Admin/Gestor/Corretor semeados e o escopo de plataforma desenhado, flag `is_super_admin` e seu script de CLI, provisionamento de tenant por CLI, **RLS ativo e testado** com o teste de schema que falha o CI, resolução de empresa por slug na URL, wrapper de transação que exige tenant, wrapper de auditoria, infraestrutura de testes (Vitest, banco de teste em container, Playwright), CI rodando os testes, deploy contínuo com um "hello world" autenticado.

**Design System:** triagem do `design-system-export` para `packages/ui` — tokens, primitivos shadcn reestilizados, os componentes de apresentação reescritos em TSX, Storybook, e a config oxlint de aderência virando a config de lint do projeto. Isso acontece depois do scaffold do monorepo, que é o que cria a pasta de destino.

A migração do Postgres para a mesma rede privada acontece **antes** desta fase, para que o pipeline seja montado contra o endereço definitivo.

Entrega uma casca vazia mas publicada e testada. A partir daqui todo incremento vai para produção.

### Fase 1 — Cadastros base (semanas 3–8)

Módulo de Configurações (parâmetros do tenant e vocabulários controlados, incluindo praças, impostos com suas alíquotas e o tipo de alqueire padrão). Contatos com papéis de comprador, proprietário e corretor externo, perfil de compra completo, regiões, culturas e formas de pagamento. Cadeia de indicação para contatos e fazendas. Fazendas com todos os campos técnicos, os dois modos de precificação, galerias nomeadas de fotos e vídeos no R2, documentos por categoria, campos personalizados, mapa MapLibre, histórico de alterações na ficha. Cotação por cultura, praça e data, com o cálculo do valor em sacas. Carga de municípios do IBGE. Busca e filtros.

Ao fim desta fase nasce o **ambiente de homologação** — a Grand Vista começa a usar de verdade, e a partir daí subir migration quebrada direto na produção do cliente é risco de outra natureza.

### Fase 2 — Comercial (semanas 9–12) → **MVP em 3 meses**

Oportunidades ligando comprador a uma ou mais fazendas, com os critérios da demanda próprios. Funil kanban com as 10 etapas configuráveis, histórico de negociação, probabilidade e valor potencial. **Venda** como entidade, com valor bruto e líquido, impostos congelados, status, área vendida e parcelas da venda. **Acordo de comissão** completo: grupos por venda, participantes, rateio com override e visibilidade restrita. Motor de matching nas duas direções, retornando demandas, com tela de configuração de regras. Envio de oportunidade por WhatsApp (`wa.me`) e e-mail.

**Marco dos 3 meses.** Aqui o sistema já substitui as planilhas: cadastra, encontra, acompanha negociações, registra vendas e calcula comissão.

### Fase 3 — Operação (semanas 13–18)

**Módulo de perfis de acesso** (abre a fase): tela de criação e edição de perfis de acesso, marcação das permissões por módulo, definição das telas visíveis e do escopo de dados, vínculo de múltiplos perfis de acesso por usuário.

**Módulo de gestão de empresas**, irmão do anterior: onde se administra o vínculo usuário↔empresa, quem acessa quais empresas, e onde um Admin cria usuários para as empresas que ele administra.

**Ledger de comissão:** parcelas, vencimentos, baixa de recebimento com valor recebido e observação da forma real de pagamento. Fica aqui, e não na Fase 2, porque é acompanhamento operacional — da mesma natureza que agenda e pendências — e porque a Fase 2 já está sem folga. O *acordo* fica na Fase 2; o que não dá para recuperar depois é o termo contratual, e ele já estará no banco.

Agenda comercial com próxima atividade obrigatória, registro de visitas, reuniões, ligações e retornos, alertas de pendência. Due diligence com os cinco checklists, pendências e status por oportunidade.

### Fase 4 — Inteligência (semanas 19–22)

Dashboard completo (pipeline, valor em negociação, valor vendido, comissão prevista, corretores ativos, tempo médio de venda, preço e ticket médio, gráficos de região e tipo de fazenda) e os alertas de inércia, com os limiares vindos das Configurações. Relatórios por etapa, região e cliente, com filtros por período, usuário, região e perfil, e consolidação por comprador, proprietário e fazenda. Exportação para Excel e PDF.

Fase deliberadamente tardia: métricas só têm sentido sobre dados reais acumulados nas fases anteriores.

### Fase 5 — Produção (semanas 23–26)

Onboarding de nova corretora, documentação da API pública (OpenAPI a partir dos schemas Zod), documentação técnica do Design System e dos módulos, **backups do servidor de banco** (estratégia própria, já que o mecanismo do aaPanel cobre só o servidor da aplicação), monitoramento de erros, endurecimento dos testes E2E, performance e acessibilidade.

---

## Risco de prazo

O escopo cresceu de forma relevante nas últimas rodadas: comissão em grupos, cadeia de indicação em N níveis, módulo de configurações, RBAC granular, Design System documentado e TDD desde o início. Depois desta rodada de decisões, cresceu mais: venda como entidade com impostos e parcelas, dois modos de precificação, cotação por praça, demanda própria por oportunidade, e a fase de modelagem completa antes da Fase 0.

As Fases 0–2 ainda cabem em 12 semanas, mas sem folga — a Fase 0 concentra agora fundação, permissões, Design System e infraestrutura de testes, e é justamente a que não pode ser cortada. O Design System chegar pronto do Claude Design compensa parte do que foi adicionado: os tokens e a direção visual já estão resolvidos, o que normalmente consome semanas.

Adiar apenas a *tela* de perfis para a Fase 3, mantendo o motor granular na Fase 0, é o que segura esse cronograma: a alternativa — papéis fixos agora e RBAC depois — custaria reescrever toda verificação de permissão já espalhada pelos módulos. A mesma lógica vale para o ledger de comissão: o acordo na Fase 2, as parcelas na Fase 3, sem que a Fase 3 precise reestruturar nada da Fase 2.

Se a Fase 1 atrasar, a ordem de corte é: **tela de configuração do matching** (mantendo pesos padrão em código, que já entregam o resultado), depois **campos personalizados**, depois **galeria de vídeos** (mantendo fotos). Os três voltam na Fase 4 sem retrabalho e nenhum bloqueia o uso real. Cadastros, cadeia de indicação, funil, comissão e matching funcionando são inegociáveis no marco dos 3 meses.

---

## Verificação

- **Isolamento multi-tenant:** teste de integração que cria dois tenants e confirma, para cada tabela, que o tenant A não enxerga nada do tenant B — inclusive com queries propositalmente sem filtro, validando o RLS.
- **Cobertura de RLS por schema:** teste que varre o schema e **falha o CI** se existir tabela de negócio sem `tenant_id`, sem policy ativa ou sem `FORCE ROW LEVEL SECURITY`, com as tabelas de autenticação como exceção explícita e nominal. É o que impede uma tabela nova nascer sem policy daqui a seis meses.
- **Papel da aplicação:** teste que falha se o papel usado na conexão for superusuário, tiver `BYPASSRLS` ou for dono de alguma tabela de negócio. Sem isso, todo o resto da suíte de isolamento pode passar sem que o RLS esteja fazendo nada.
- **Contexto de empresa:** teste provando que um usuário sem vínculo recebe **404** (nunca 403) ao acessar o slug de outra empresa, por listagem e por ID direto, e que o wrapper de transação estoura erro quando não há tenant definido.
- **Permissões e escopo:** testes cobrindo perfis de acesso semeados e customizados, garantindo que sem a permissão certa a rota nega, e que um usuário de escopo restrito não acessa fazenda nem oportunidade de outro responsável, seja por listagem ou por ID direto. Inclui o caso de usuário com dois perfis de acesso, onde vale a união das permissões, e o caso de Gestor que é corretor responsável — perfil de acesso amplo com carteira própria.
- **Super Admin:** teste provando que a flag nunca aparece em nenhuma resposta da API, que o super admin surge como usuário comum nas listagens de equipe, e que a flag não é alterável por rota alguma — só pelo script de CLI.
- **Comissão:** testes unitários do rateio (divisão igual, override individual, soma que não fecha) e teste de integração provando que a API não devolve a comissão dos colegas para um Corretor. Mais o caso que a ADR 0001 cria: uma oportunidade com três vendas, cada uma com seus grupos, provando que o total não se mistura entre fazendas.
- **Impostos e valor líquido:** teste de que a comissão incide sobre o líquido, e que alterar a alíquota no catálogo **não** altera o valor de uma venda já fechada.
- **Precificação:** testes unitários dos dois modos — valor em reais estático, e avaliação em sacas convertida pela cotação da praça da fazenda na data — mais a conversão de alqueire para hectare nos três tipos.
- **Auditoria:** editar uma fazenda e confirmar que cada campo alterado gerou registro com valor anterior, novo, autor e rótulo legível.
- **Fluxo E2E (Playwright):** cadastrar fazenda → conferir demandas compatíveis → criar oportunidade → registrar venda → definir grupos de comissão → mover no funil → registrar atividade.
- **A cada fase:** `pnpm dev` e exercitar o módulo no navegador, e `pnpm build` gerando os artefatos de produção sem erro.
- **Sempre:** suíte de testes verde, `tsc --noEmit` limpo nos pacotes, e migrations aplicando de banco zerado.

---

## Próximo passo

Nesta ordem:

1. **Migrar o Postgres** para a mesma rede privada da API, já na versão 16+, para que o pipeline da Fase 0 seja montado uma vez só contra o endereço definitivo.
2. **Modelo de dados completo** (Fase -1) — todas as tabelas e colunas das seis fases, de uma vez, para que as migrations seguintes sejam só aditivas.
3. **Specs por módulo** em `docs/specs/`, escritas contra esse modelo.
4. **Fase 0**, com agentes distintos pegando issue por issue.

Os tokens de marca já vêm resolvidos do `design-system-export`. A pendência de design que resta é o **logotipo vetorial**, que não bloqueia nada: enquanto não chegar, a marca aparece pelo `Wordmark`, só tipográfico, e o monograma não deve ser aproximado.