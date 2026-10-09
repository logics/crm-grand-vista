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

Pendências de **negócio**, resolvíveis durante a Fase 1 (não bloqueiam o início):

- Logo e paleta de cores da Grand Vista, para o Design System.
- Valores iniciais dos vocabulários controlados: aptidões, culturas, status comercial, classificações, origens de lead, categorias de documento, nomes de galeria. Todos viram cadastros configuráveis por tenant, mas precisam de uma carga inicial.

---

## Glossário

O escopo usa "oportunidade" com dois sentidos e "classificação" com três. Como esses termos viram nome de tabela, de coluna, de filtro e de rótulo na tela, ficam fixados aqui — e o registro de metadados de campo é a implementação desse glossário.

| Termo | Significa | Onde vive |
|---|---|---|
| **Fazenda** | O imóvel captado pela corretora | `farms` |
| **Potencial de venda** | Quão promissora a fazenda é como ativo vendável. Atribuído na captação, existe antes de haver qualquer comprador | `farms.sales_potential` |
| **Prioridade** | Urgência com que a equipe deve trabalhar aquela captação | `farms.priority` |
| **Status comercial** | Situação da fazenda na carteira: disponível, em negociação, vendida, suspensa | `farms.commercial_status` |
| **Oportunidade** | Uma negociação entre um comprador e uma ou mais fazendas | `opportunities` |
| **Etapa do funil** | Onde a negociação está nas 10 etapas: qualificação, visita técnica, due diligence… | `opportunities.stage_id` |
| **Probabilidade** | Chance de fechamento daquela negociação | `opportunities.probability` |
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

**Backend:** Node.js + Hono + Drizzle ORM + PostgreSQL + Zod
**Frontend:** React + Vite + shadcn/ui + TanStack Query + React Hook Form + MapLibre
**Auth:** Better Auth (organizations plugin)
**Storage:** Cloudflare R2 (S3-compatible)
**Testes:** Vitest (unitários e integração) + Playwright (E2E)
**Monorepo:** pnpm workspaces

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

---

## Design System

Requisito de primeira classe, não acabamento. `packages/ui` concentra tokens (cores da marca, tipografia, espaçamento, raios), os primitivos shadcn customizados e os componentes compostos do domínio. Documentado em Storybook, com cada componente exibindo variantes e estados.

Componentes compostos que nascem cedo e são reaproveitados por todos os módulos:

`DataTable` (filtros, ordenação, paginação, exportação) · `Pagination` · `AsyncCombobox` · `DateRangePicker` · `EntityForm` (validação Zod, layout em seções) · `MediaUploader` · `DocumentManager` · `ContactPicker` / `FarmPicker` / `MunicipalityPicker` · `ReferralChainEditor` · `CommissionEditor` · `AuditTimeline` · `KanbanBoard` · `ChecklistPanel` · `StatCard` · `CompatibilityGauge` · `MoneyInput` / `AreaInput` / `PercentInput`

Três deles carregam o resto do sistema e por isso ganham atenção especial:

- **`AsyncCombobox`** — busca na API conforme o usuário digita, com debounce, estados de carregando/vazio/erro, seleção única ou múltipla, limpar seleção, desmarcar item já escolhido, valor inicial hidratado por ID e paginação incremental do resultado. É a base de `ContactPicker`, `FarmPicker`, `MunicipalityPicker` e de todo seletor de vocabulário controlado — escrever isso uma vez, bem feito, elimina dezenas de variações espalhadas.
- **`Pagination`** — componente isolado, não acoplado ao `DataTable`, para servir também a listas em card, galerias e resultados de matching.
- **`DateRangePicker`** — seleção de período atravessando vários meses, com dois calendários lado a lado e atalhos (mês atual, últimos 30 dias, trimestre, ano), no espírito do AntD. Usado nos filtros de relatório e do dashboard.

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

### Perfis de acesso configuráveis

O sistema não tem papéis fixos em código. Existe um **catálogo de permissões granulares** (`fazendas.criar`, `oportunidades.editar`, `comissao.ver_de_terceiros`, `configuracoes.gerenciar`…), e cada tenant monta seus próprios perfis de acesso combinando essas permissões, definindo também quais telas cada um acessa e qual o escopo de dados por módulo. Um usuário pode ter vários perfis de acesso vinculados; vale a união das permissões.

Admin, Gestor e Corretor entram como perfis de acesso **semeados** na criação do tenant — cobrem o uso desde o primeiro dia, e o administrador da empresa depois ajusta, cria novos ou remove conforme a corretora trabalha.

Decisão de sequenciamento importante: o *motor* é granular desde a Fase 0, mas a *tela* de administração de perfis de acesso só entra na Fase 3. Como as verificações já consultam permissões desde o início, essa tela é apenas um CRUD sobre estruturas que já existem — não há retrabalho, e o marco dos 3 meses fica protegido.

### Super Admin

Flag `is_super_admin` na tabela de usuários, marcada exclusivamente por script de CLI — não há rota, tela ou payload que a altere. Quem a tem passa por todas as verificações de permissão e escopo, inclusive entre tenants.

O sigilo é requisito, não detalhe: a flag é removida de toda serialização de usuário, e as listagens de equipe, os seletores de responsável e os relatórios exibem o super admin como um usuário comum, com os perfis que estiverem de fato vinculados a ele. Isso vira teste de integração — nenhuma resposta da API pode conter o campo, para nenhum papel.

### Auditoria

O escopo pede "logs de auditoria" como requisito geral e "histórico de alterações" como campo de fazenda — é o mesmo mecanismo. Tabela `audit_log` genérica (`tenant_id`, entidade, `entity_id`, campo, valor anterior, valor novo, usuário, timestamp), alimentada por um wrapper de escrita no Drizzle, para não depender de o desenvolvedor lembrar de registrar. A exibição usa os metadados de campo para mostrar rótulo legível e valor formatado.

---

## Modelo de dados

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
- `crop_quotes` — cotação da saca por cultura e data (base do valor em sacas)
- `municipalities` — municípios brasileiros com estado e região, carga inicial do IBGE
- Vocabulários configuráveis: `aptitudes`, `crops`, `commercial_statuses`, `lead_sources`, `document_categories`, `gallery_types`

**Contatos**
- `contacts` — PF/PJ, dados de contato, classificação, origem do lead e do relacionamento, observações estratégicas
- `contact_roles` — `comprador`, `proprietario` e/ou `corretor_externo` (acumuláveis)
- `buyer_profiles` — **perfil de compra**, 1:1 opcional: ticket médio e máximo, faixa de hectares, patrimônio estimado, capacidade de investimento, urgência, grau de qualificação e `purchase_profile` (investidor, produtor, especulador…)
- `buyer_regions`, `buyer_crops`, `buyer_payment_methods` — interesses e formas de pagamento aceitas (múltiplas)

**Cadeia de indicação**
- `referral_links` — quem trouxe quem, em N níveis. Aponta para um sujeito (contato ou fazenda) e guarda a posição na cadeia e o **indicador**, polimórfico: `referrer_user_id` ou `referrer_contact_id`, exatamente um dos dois preenchido.

Modela literalmente "o Pedro veio pelo João, que pegou com o Sebastião" e "essa fazenda veio pelo corretor Carlos, que soube pelo Antônio". Vale para os dois lados, comprador e vendedor, e não depende de o proprietário estar identificado. Renderizada e editada pelo `ReferralChainEditor`.

**Fazendas**
- `farms` — identificação, município, **proprietário opcional** (`owner_contact_id`), corretor responsável (`responsible_user_id`), áreas total e útil, aptidão, solo, topografia, água, disponibilidade hídrica, potencial de irrigação, distâncias de rodovias e armazéns, produtividade histórica e potencial, infraestrutura, faixa de valor, valor por hectare e por hectare útil, situação documental, status comercial, **potencial de venda** (`sales_potential`), prioridade, resumo técnico, diferenciais, coordenada aproximada, `custom_fields` (JSONB)
- `farm_galleries` — agrupamento de mídia por tipo nomeado (Solo, Aérea, Sede…), com os nomes vindos de `gallery_types`
- `farm_media` — fotos e vídeos no R2, vinculados a uma galeria
- `farm_documents` — anexos vinculados a `document_categories`

**Comercial**
- `opportunities` — negociação, probabilidade, valor potencial, etapa, corretor responsável (`responsible_user_id`)
- `opportunity_farms` — junção N:N entre oportunidade e fazendas
- `pipeline_stages` — as 10 etapas, configuráveis por tenant
- `activities` — visitas, reuniões, ligações, retornos, próxima atividade
- `due_diligence_items` — checklists jurídico, ambiental, fundiário, fiscal e documental

**Comissão**
- `commission_groups` — grupo dentro de uma oportunidade, com nome e **% sobre o valor da venda**
- `commission_members` — **participante da comissão**, polimórfico como o indicador (`party_user_id` ou `party_contact_id`), com % próprio opcional

Regra: a comissão é obrigação do vendedor. A comissão total da negociação é a soma dos % dos grupos. Dentro de cada grupo, a divisão é igual entre os membros por padrão; informar um % específico para um membro sobrescreve o cálculo, e o sistema avisa quando a soma do grupo não fecha 100%. Toda a aritmética fica num serviço puro e testável, isolado de HTTP e banco.

Valores monetários em `numeric`, nunca `float`. Campos personalizados em `JSONB` com definições tipadas por tenant: evita EAV, que destruiria a legibilidade das queries, e o Postgres indexa `JSONB` com GIN quando precisar filtrar. Município como tabela referenciada, não texto livre — sem isso o matching por região não é confiável e os relatórios regionais não agregam.

---

## Matching configurável

Requisito central, exigido nas duas direções: ao cadastrar uma fazenda o sistema retorna compradores compatíveis; na ficha do comprador aparecem as fazendas aderentes.

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

## Roadmap

### Fase 0 — Fundação (semanas 1–2)

Monorepo pnpm, Docker Compose com Postgres, Drizzle com migrations, Better Auth com organizations, **motor de permissões granulares** com os perfis Admin/Gestor/Corretor semeados, flag `is_super_admin` e seu script de CLI, **RLS ativo e testado**, wrapper de auditoria, infraestrutura de testes (Vitest, banco de teste em container, Playwright), base do Design System com tokens da marca e Storybook, CI rodando os testes, deploy contínuo com um "hello world" autenticado.

Entrega uma casca vazia mas publicada e testada. A partir daqui todo incremento vai para produção.

### Fase 1 — Cadastros base (semanas 3–8)

Módulo de Configurações (parâmetros do tenant e vocabulários controlados). Contatos com papéis de comprador, proprietário e corretor, perfil de compra completo, regiões, culturas e formas de pagamento. Cadeia de indicação para contatos e fazendas. Fazendas com todos os campos técnicos, galerias nomeadas de fotos e vídeos no R2, documentos por categoria, campos personalizados, mapa MapLibre, histórico de alterações na ficha. Cotação da saca e cálculo do valor em sacas. Carga de municípios do IBGE. Busca e filtros.

### Fase 2 — Comercial (semanas 9–12) → **MVP em 3 meses**

Oportunidades ligando comprador a uma ou mais fazendas, funil kanban com as 10 etapas configuráveis, histórico de negociação, probabilidade e valor potencial. Grupos de comissão com rateio e visibilidade restrita por papel. Motor de matching nas duas direções, com tela de configuração de regras. Envio de oportunidade por WhatsApp (`wa.me`) e e-mail.

**Marco dos 3 meses.** Aqui o sistema já substitui as planilhas: cadastra, encontra, acompanha negociações e calcula comissão.

### Fase 3 — Operação (semanas 13–18)

**Módulo de perfis de acesso** (abre a fase): tela de criação e edição de perfis de acesso, marcação das permissões por módulo, definição das telas visíveis e do escopo de dados, vínculo de múltiplos perfis de acesso por usuário.

Agenda comercial com próxima atividade obrigatória, registro de visitas, reuniões, ligações e retornos, alertas de pendência. Due diligence com os cinco checklists, pendências e status por oportunidade.

### Fase 4 — Inteligência (semanas 19–22)

Dashboard completo (pipeline, valor em negociação, valor vendido, comissão prevista, corretores ativos, tempo médio de venda, preço e ticket médio, gráficos de região e tipo de fazenda) e os alertas de inércia, com os limiares vindos das Configurações. Relatórios por etapa, região e cliente, com filtros por período, usuário, região e perfil, e consolidação por comprador, proprietário e fazenda. Exportação para Excel e PDF.

Fase deliberadamente tardia: métricas só têm sentido sobre dados reais acumulados nas fases anteriores.

### Fase 5 — Produção (semanas 23–26)

Onboarding de nova corretora, documentação da API pública (OpenAPI a partir dos schemas Zod), documentação técnica do Design System e dos módulos, backups automatizados, monitoramento de erros, endurecimento dos testes E2E, performance e acessibilidade.

---

## Risco de prazo

O escopo cresceu de forma relevante nas últimas rodadas: comissão em grupos, cadeia de indicação em N níveis, módulo de configurações, RBAC granular, Design System documentado e TDD desde o início. As Fases 0–2 ainda cabem em 12 semanas, mas sem folga — a Fase 0 concentra agora fundação, permissões e infraestrutura de testes, e é justamente a que não pode ser cortada.

Adiar apenas a *tela* de perfis para a Fase 3, mantendo o motor granular na Fase 0, é o que segura esse cronograma: a alternativa — papéis fixos agora e RBAC depois — custaria reescrever toda verificação de permissão já espalhada pelos módulos.

Se a Fase 1 atrasar, a ordem de corte é: **tela de configuração do matching** (mantendo pesos padrão em código, que já entregam o resultado), depois **campos personalizados**, depois **galeria de vídeos** (mantendo fotos). Os três voltam na Fase 4 sem retrabalho e nenhum bloqueia o uso real. Cadastros, cadeia de indicação, funil, comissão e matching funcionando são inegociáveis no marco dos 3 meses.

---

## Verificação

- **Isolamento multi-tenant:** teste de integração que cria dois tenants e confirma, para cada tabela, que o tenant A não enxerga nada do tenant B — inclusive com queries propositalmente sem filtro, validando o RLS.
- **Permissões e escopo:** testes cobrindo perfis de acesso semeados e customizados, garantindo que sem a permissão certa a rota nega, e que um usuário de escopo restrito não acessa fazenda nem oportunidade de outro responsável, seja por listagem ou por ID direto. Inclui o caso de usuário com dois perfis de acesso, onde vale a união das permissões, e o caso de Gestor que é corretor responsável — perfil de acesso amplo com carteira própria.
- **Super Admin:** teste provando que a flag nunca aparece em nenhuma resposta da API, que o super admin surge como usuário comum nas listagens de equipe, e que a flag não é alterável por rota alguma — só pelo script de CLI.
- **Comissão:** testes unitários do rateio (divisão igual, override individual, soma que não fecha) e teste de integração provando que a API não devolve a comissão dos colegas para um Corretor.
- **Auditoria:** editar uma fazenda e confirmar que cada campo alterado gerou registro com valor anterior, novo, autor e rótulo legível.
- **Fluxo E2E (Playwright):** cadastrar fazenda → conferir compradores compatíveis → criar oportunidade → definir grupos de comissão → mover no funil → registrar atividade.
- **A cada fase:** `pnpm dev` e exercitar o módulo no navegador, e `pnpm build` gerando os artefatos de produção sem erro.
- **Sempre:** suíte de testes verde, `tsc --noEmit` limpo nos pacotes, e migrations aplicando de banco zerado.

---

## Próximo passo

Fase 0. Precisarei da logo e das cores da Grand Vista para os tokens do Design System, mas o setup do monorepo, banco, auth, RLS, auditoria e infraestrutura de testes começa sem isso.