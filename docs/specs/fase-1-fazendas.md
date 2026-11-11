# Spec — Fazendas

> **Leitura obrigatória:** `CLAUDE.md`, `CONTEXT.md` (seção "Fazenda", "Contato" — **Proprietário**, **Proprietário principal** —, "Área e unidades", "Valores e impostos" — **Preço pedido**, **Avaliação**, **Modo de precificação**, **Praça** —, e **Escopo de dados**, **Corretor responsável**), `docs/specs/modelo-de-dados.md` (convenções e seção 6), `docs/specs/fase-1-fundacao.md` (metadados de campo, histórico, padrão de listagem), `docs/specs/fase-1-configuracoes.md` (cadastros auxiliares, significado de sistema, entrada padrão, praça, semente), `docs/specs/fase-1-contatos.md` (`ContactField`, "garantir papel", uso declarado, seções registráveis, aviso de duplicata) e `docs/specs/fase-0-permissoes.md` (escopo de dados e 404). Esta spec é autossuficiente — não há histórico de conversa a recuperar.

## Objetivo

O módulo **Fazendas**: o cadastro técnico e comercial do imóvel captado. Entrega:

1. `farms` com identificação, áreas, técnico, comercial e os dois modos de precificação — ou nenhum, enquanto o preço não é conhecido —, mais as junções `farm_owners`, `farm_crops` e `farm_aptitudes`.
2. A **lista** com os critérios de busca do escopo (região, valor, área, aptidão, critérios técnicos) e a **ficha** com seções registráveis, onde mapa, galerias, documentos e cadeia de indicação penduram as suas depois.
3. A **prova de integração do escopo de dados `own`** que a `fase-0-permissoes` deixou para cá: o primeiro módulo com corretor responsável.
4. **Desativar antes de excluir**: o significado de sistema novo `inactive` no status comercial e a exclusão protegida por ele e por confirmação digitada.
5. Peças compartilhadas que nascem aqui e servem aos dois cadastros: a normalização de texto da busca (`normalize_text`), o `DuplicateWarning` em `packages/ui` e o aviso de alteração não salva (`useUnsavedChangesGuard`), aplicados também a contatos.

## Vocabulário

`CONTEXT.md`: **Fazenda**, **Potencial de venda**, **Status comercial**, **Fazenda suspensa**, **Fazenda desativada**, **Prioridade**, **Aptidão**, **Culturas da fazenda**, **Situação documental**, **Proprietário**, **Proprietário principal**, **Corretor responsável**, **Hectare**, **Alqueire**, **Preço pedido**, **Avaliação**, **Modo de precificação**, **Praça**, **Escopo de dados**, **Histórico de alterações**.

Na tela, o menu e a lista se chamam **Fazendas**. "Classificação da oportunidade", do escopo, é o **potencial de venda** — banco, API e tela. O corretor responsável aparece como "Corretor responsável", nunca "Responsável" sozinho, que colidiria com o "proprietário ou responsável" do escopo.

## Decisões que governam

- `docs/specs/modelo-de-dados.md` — seção 6 (`farms`, `farm_owners`, `farm_crops`, `farm_aptitudes`); junções auditáveis; sem soft delete; FK para cadastro auxiliar `ON DELETE RESTRICT`; área `numeric(12,4)` sempre em hectares; dinheiro `numeric(16,2)`; coordenada `numeric(10,7)`
- `fase-0-permissoes.md` — `fazendas.ver|criar|editar|excluir` já estão no catálogo; o Corretor tem ver, criar e editar, sem excluir, com escopo `own`; registro fora do escopo é **404**; com vários perfis vale o mais amplo
- `fase-1-fundacao.md` — contrato de listagem e `ListPage`; escopo aplicado também no `count`; histórico montado sob o próprio recurso com filhos declarados; registro de metadados com teste de cobertura
- `fase-1-configuracoes.md` — `VocabularyField`; entrada padrão por significado; cada significado mantém ao menos uma entrada ativa; sugestão de praça pela leitura do módulo; `TENANT_SEED`
- `fase-1-contatos.md` — `ContactField` com cadastro rápido; "garantir papel" (`ensureContactRole`) na transação do save; uso declarado (`declareRoleUsage`); seções registráveis da ficha; aviso de duplicata

## Modelo de dados

### `farms`

| Coluna | Tipo | Regra |
|---|---|---|
| `name` | text NOT NULL | 1–200, sem espaços nas pontas |
| `municipality_ibge_code` | text NOT NULL → `municipalities` | município ativo na criação; o inativo já gravado continua exibido |
| `responsible_user_id` | uuid NOT NULL → `users` `RESTRICT` | corretor responsável |
| `trading_post_id` | uuid nulo → `trading_posts` `RESTRICT` | praça de referência |
| `total_area_ha` | numeric(12,4) NOT NULL | > 0 |
| `usable_area_ha` | numeric(12,4) nulo | > 0 e ≤ `total_area_ha` (`CHECK`) |
| `commercial_status_id` | uuid NOT NULL → `commercial_statuses` `RESTRICT` | padrão: primeira entrada ativa de `available` |
| `sales_potential`, `priority` | text nulo, nível | potencial de venda e prioridade |
| `water_availability`, `irrigation_potential`, `productive_potential` | text nulo, nível | disponibilidade hídrica, potencial de irrigação, potencial produtivo |
| `soil`, `topography`, `water`, `historical_productivity`, `infrastructure`, `technical_summary`, `differentials` | text nulo | texto livre, até 10.000. `water` é a descrição (rios, nascentes, represas); a nota é `water_availability` |
| `distance_to_highway_km`, `distance_to_warehouse_km` | numeric(8,2) nulo | ≥ 0 |
| `document_status` | text nulo, `CHECK ('regular','pending','irregular')` | situação documental |
| `document_notes` | text nulo | detalhe da situação documental, até 10.000 |
| `latitude`, `longitude` | numeric(10,7) nulo | as duas ou nenhuma (`CHECK`); −90..90 e −180..180; sem trava de "dentro do Brasil" |
| `pricing_mode` | text **nulo**, `CHECK ('brl','bags')` | nulo = **sem preço** |
| `asking_price` | numeric(16,2) nulo | > 0; preço pedido |
| `valuation_bags` | numeric(14,4) nulo | > 0 |
| `valuation_bags_unit` | text nulo, `CHECK ('per_hectare','per_alqueire')` | |
| `valuation_bags_alqueire_type` | text nulo, `CHECK ('goiano','paulista','norte')` | congela o tipo da avaliação |
| `valuation_crop_id` | uuid nulo → `crops` `RESTRICT` | cultura de referência |
| `custom_fields` | jsonb NOT NULL DEFAULT `'{}'` | criada agora, **sem uso** nesta spec (`fase-1-campos-personalizados`) |

Mais `id`, `tenant_id`, timestamps e RLS, pelas convenções. Saem do desenho anterior do modelo `owner_contact_id` (vira `farm_owners`) e `aptitude_id` (vira `farm_aptitudes`).

**Nível** é um tipo único: a constante `LEVELS = ['high','medium','low']` em `packages/shared`, com os rótulos Alta/Média/Baixa e o schema Zod. Um helper `levelCheck(column)` monta o `CHECK` de cada uma das cinco colunas a partir da constante — nenhum `CHECK` escrito à mão, e nenhum `DOMAIN` do Postgres (convenção do modelo: `text` + `CHECK`).

**`CHECK` da precificação** — o conjunto de cada modo preenchido e o do outro vazio:

- `pricing_mode IS NULL` → `asking_price`, `valuation_bags`, `valuation_bags_unit`, `valuation_bags_alqueire_type` e `valuation_crop_id` todos nulos
- `'brl'` → `asking_price` preenchido; os quatro de sacas nulos
- `'bags'` → `valuation_bags`, `valuation_bags_unit` e `valuation_crop_id` preenchidos; `asking_price` nulo; `valuation_bags_alqueire_type` preenchido **se e somente se** a unidade é `per_alqueire`

Índices: `(tenant_id, responsible_user_id)` (escopo `own`), `(tenant_id, commercial_status_id)`, `(tenant_id, municipality_ibge_code)`, `(tenant_id, created_at DESC, id)` (ordem padrão).

### Junções

Todas junções auditáveis (`id` uuid PK, `tenant_id`, timestamps, RLS), `farm_id` → `farms` `ON DELETE CASCADE`, e filhos declarados no histórico da fazenda.

| Tabela | Colunas | Regra |
|---|---|---|
| `farm_owners` | `contact_id` → `contacts` `RESTRICT`, `is_primary` boolean NOT NULL | `UNIQUE (farm_id, contact_id)`; índice único parcial `(farm_id) WHERE is_primary` — um principal por fazenda |
| `farm_crops` | `crop_id` → `crops` `RESTRICT` | `UNIQUE (farm_id, crop_id)` — a **mesma** tabela de culturas de `buyer_crops` e `opportunity_crops`: o matching (Fase 2) casa por interseção |
| `farm_aptitudes` | `aptitude_id` → `aptitudes` `RESTRICT` | `UNIQUE (farm_id, aptitude_id)` |

### Status comercial: significado `inactive`

O `CHECK` de `commercial_statuses.system_meaning` passa a `('available','negotiating','sold','suspended','inactive')`, com o rótulo "Desativada". `TENANT_SEED` ganha **Desativada** (`inactive`) no fim da ordem — empresas novas a recebem pelo `tenant:provision`.

Nas existentes, uma migration de semente, no padrão de `0019_contacts_seed.sql` (`NOT EXISTS`, reexecutável):

- insere para toda empresa que **não tem nenhuma entrada `inactive` ativa**;
- com o nome "Desativada", ou "Fazenda desativada" se aquele já estiver ocupado (comparação `normalize_text`, a do índice único);
- no fim da ordem manual (`display_order` = maior + 1).

### Normalização de texto

Uma migration **renomeia** `normalize_vocabulary_name` para `normalize_text` (`ALTER FUNCTION … RENAME`). A função já é `IMMUTABLE` (`0010_crops.sql`), e os índices de unicidade dos cadastros auxiliares a referenciam pelo OID, então continuam válidos. Referências por nome a atualizar: `packages/db/src/schema/vocabulary.ts` (senão o `drizzle-kit generate` vê diferença nos índices). As migrations já aplicadas ficam como estão — num banco zerado, rodam antes do rename. Nenhuma view ou trigger a referencia.

## Regras de negócio

### Mínimo para salvar

**Nome, município, corretor responsável e área total.** Proprietários, praça, preço, culturas, aptidões e todos os campos técnicos são opcionais — a captação é preenchida aos poucos.

### Referências

- Toda referência gravada tem de existir **na empresa ativa**: contato, cultura, aptidão, praça, status comercial, cultura de referência. A FK não passa pelo RLS, então o serviço confere antes de gravar — referência inexistente ou de outra empresa é **400** no campo, nunca 500 nem vazamento (precedente: classificação e origem do lead em contatos).
- O corretor responsável tem de ter **vínculo** com a empresa ativa (400).
- Referência que **muda** tem de apontar para entrada **ativa** (cadastro auxiliar) ou município ativo (400). A entrada ou o município que ficou inativo depois de gravado **continua** na fazenda e é exibido pela hidratação por id — salvar sem tocar no campo não o recusa.

### Áreas

- Gravadas em hectares, 4 casas. A área útil, se informada, é ≤ área total (400).
- Digitadas em hectares ou em alqueires: o `AreaInput` (`packages/ui`) já mantém o valor em hectares e mostra a unidade escolhida; o tipo de alqueire vem pré-preenchido com o padrão da empresa e pode ser trocado no campo. A entrada **não** grava o tipo — área é medida física; só a avaliação por alqueire congela tipo.
- **Sem deriva na ida e volta:** o valor de verdade no formulário é sempre o de hectares; a exibição em alqueire é derivada, e o campo só é reconvertido e enviado se o usuário o editou. Abrir e salvar uma fazenda sem tocar na área, com a exibição em alqueire, não gera alteração no histórico.

### Precificação

- **Três estados:** sem preço, em reais (preço pedido) ou em sacas (avaliação: quantidade, unidade por hectare ou por alqueire, tipo do alqueire quando por alqueire, cultura de referência).
- **Trocar de modo apaga o conjunto do outro** no mesmo save; o histórico guarda os valores anteriores. O formulário pede confirmação ao trocar de modo com valor preenchido. Apagar o modo (voltar a "sem preço") apaga tudo.
- **Derivados, nunca colunas.** Em reais: valor por hectare e por hectare útil. Em sacas, até `fase-1-cotacoes`: sacas por hectare (convertendo a unidade da avaliação), **sem** equivalente em reais. Sem preço: "Preço não informado".
- A conversão de unidade da avaliação usa `alqueiresToHectares`/`hectaresToAlqueires` (`packages/shared`), com o tipo **congelado** na avaliação — nunca o padrão da empresa.

### Corretor responsável

- Padrão: o usuário logado. O seletor (`UserPicker`) lista os usuários com vínculo na empresa, sem o super admin.
- **Escopo `own` só atribui a si mesmo**, na criação e na edição: o campo vem travado no próprio usuário, e enviar outro responsável é **403** — o dado é válido, quem não pode é o usuário. Atribuir e transferir é de quem tem escopo `all`. Sem permissão nova.

### Proprietários

- Zero ou mais, de `farm_owners`. **Com ao menos um, exatamente um é o principal** (400 se nenhum ou mais de um). O primeiro incluído vira principal; retirar o principal faz o formulário promover o próximo.
- `owners: [{ contactId, isPrimary }]` no `POST`/`PATCH` substitui o conjunto.
- **Aplicação por diferença, em ordem fixa**, nunca delete + insert (que regravaria quem não mudou e poluiria o histórico):
  1. `SELECT … FOR UPDATE` na linha da fazenda, no início do save — serializa saves concorrentes;
  2. apaga os retirados;
  3. tira `is_primary` do antigo principal, se mudou;
  4. marca o novo principal entre os que ficam;
  5. insere os novos — o que entra já como principal vai com `is_primary = true`, porque o passo 3 liberou o índice.
- Rede de segurança: violação (`23505`) do índice parcial vira **409**, nunca 500.
- Cada contato incluído recebe o papel proprietário por `ensureContactRole`, na mesma transação. Garantir o papel é efeito do save da fazenda: exige `fazendas.criar`/`editar`, não `contatos.editar`.
- Escolher proprietário usa o `ContactField` com papel `owner`: a busca exige `contatos.ver`; sem ela o campo fica somente leitura, com os nomes hidratados por `/contacts/options?ids=` (que responde a qualquer vínculo). O cadastro rápido exige `contatos.criar`.
- **Uso declarado:** `declareRoleUsage('owner', { table: 'farm_owners', column: 'contact_id', label: { singular: 'fazenda', plural: 'fazendas' }, inUsePhrase: 'é proprietário de fazenda' })`. A `RoleUsage` ganha o campo opcional `inUsePhrase`: a mensagem de exclusão de contato barrada pela FK `RESTRICT` usa a frase quando a tabela a declarou — "Este contato é proprietário de fazenda. Remova-o das fazendas antes de excluir." — e cai no rótulo da entidade quando não. O mapeamento continua **pela tabela** que o erro do Postgres traz; nada de mapear pelo nome da constraint.
- "Proprietário ou responsável", do escopo: só o proprietário. Procurador ou gerente da fazenda vai em observação (ver Fora de escopo).

### Praça

- A **sugestão acontece só no front**: ao escolher ou trocar o município, a praça é preenchida com a que atende o município (leitura de `fase-1-configuracoes`) — **apenas se o usuário não a escolheu à mão nesta edição**. Município sem praça atendente não sugere nada.
- A API grava o que recebe e nunca sugere nem reatribui. Mudar os municípios de uma praça não toca fazenda salva.

### Status comercial

- Fazenda nova nasce com a primeira entrada ativa de `available` (entrada padrão do motor).
- Na Fase 1, a edição é **manual e livre**, para qualquer entrada ativa. A automação a partir de oportunidade e venda é decisão da Fase 2. Toda troca vai para o histórico pelo wrapper de auditoria — é de onde a Fase 2 parte.

### Exclusão

- Física, com `fazendas.excluir` (o Corretor não tem). Fora do escopo `own`, **404**.
- **Só fazenda desativada** (status de significado `inactive`) pode ser excluída. A regra fica no serviço, na mesma transação do delete, lendo o status com `SELECT … FOR UPDATE` — ninguém reativa entre a checagem e o delete. Fora desse status: **409** "Desative a fazenda antes de excluir."
- **Confirmação digitada:** o diálogo pede o nome da fazenda; o botão só habilita com o nome exato. A API não recebe a confirmação — é proteção de interface; a de domínio é o status.
- `farm_owners`, `farm_crops` e `farm_aptitudes` vão junto (`CASCADE`, auditados como filhos). Galerias, documentos e a limpeza no R2 são das specs deles; oportunidades (Fase 2) referenciam com `RESTRICT` e o 409 "em uso".

### Desativadas na listagem

O filtro padrão de status é **"todos menos desativadas"**, aplicado **na API** quando o parâmetro de status não vem — busca e `total` batem com a tela. Vendida, suspensa e as demais aparecem por padrão. O filtro mostra o que está aplicado, e "limpar filtros" volta a esse padrão, não a "todos".

Nos seletores (`/options`), as desativadas também ficam fora da busca, mas a hidratação por `ids` as devolve — uma cadeia de indicação ou oportunidade que já aponta para elas continua exibindo.

### Aviso de duplicata

Antes de salvar (criação e edição), o formulário consulta fazendas com o **mesmo nome sem caixa nem acento no mesmo município**, com o motivo "mesmo nome no mesmo município". É aviso, não bloqueio — "salvar mesmo assim". Na edição, a própria fazenda fica fora. A consulta respeita o escopo de dados: o Corretor `own` não descobre por ela fazenda alheia.

### Busca textual

`q` busca, sem caixa nem acento, em: nome, município, nome dos proprietários e os sete textos livres (`soil`, `topography`, `water`, `historical_productivity`, `infrastructure`, `technical_summary`, `differentials`), mais `document_notes`. **Substring**, não radical: "sant" acha "Santa Rita".

O `searchClause` compartilhado (`apps/api/src/listing/query.ts`) passa a gerar `normalize_text(coluna) LIKE normalize_text(padrão)` — em todos os módulos, não só aqui. Um índice trigram futuro sobre `normalize_text(coluna)` entra sem tocar query. **Sem índice nesta spec**: o volume é de centenas a poucos milhares de fazendas por empresa, recortadas pelo RLS — o precedente de municípios e da fundação. Contatos e municípios ganham a mesma forma, com teste de regressão das buscas existentes.

### Escopo de dados

A cláusula de escopo da `fase-0-permissoes` sobre `responsible_user_id`, aplicada em **todas** as leituras e escritas: lista e `total`, `/options`, detalhe, histórico, duplicatas, `PATCH`, `DELETE`, e a seção "Fazendas" da ficha do contato. Fora do escopo é **404** por id direto; na lista, simplesmente não existe — inclusive no `total` e quando o filtro aponta para um proprietário que só tem fazendas alheias (lista vazia, sem erro).

### Auditoria

Toda escrita passa pelo wrapper — fazenda e junções, num `change_id` por save. `farms`, `farm_owners`, `farm_crops` e `farm_aptitudes` entram nos metadados de campo, na ordem do formulário: níveis e situação documental como lista fechada; áreas como área; preço como dinheiro; município e cadastros auxiliares como referência; `is_primary` aparece como "Proprietário principal: João → Maria"; `custom_fields` oculto nesta spec.

## Contratos de API

Todas sob `/e/:tenant/farms`.

```
GET    /                → 200 { items, total, page, pageSize }                       (fazendas.ver + escopo)
         ?page&pageSize&sort=createdAt|-createdAt|name|-name|totalAreaHa|-totalAreaHa|askingPrice|-askingPrice&q
         &region=<ibge|UF,…>&tradingPostId=<…>&aptitudeId=<…>&cropId=<…>
         &areaMin&areaMax                       (hectares; o front converte da unidade de exibição)
         &priceMin&priceMax                     (só fazendas em reais; incompatível com noPrice — 400)
         &noPrice=true
         &commercialStatusId=<…>                (ausente = todos menos inactive)
         &salesPotential=<…>&priority=<…>&documentStatus=<…>
         &waterAvailability=<…>&irrigationPotential=<…>&productivePotential=<…>
         &maxDistanceToHighwayKm&maxDistanceToWarehouseKm
         &responsibleUserId=<…>&ownerContactId
GET    /options         → 200 { items: FarmOption[], nextCursor? }                   (fazendas.ver + escopo)
         ?q&cursor&ids=<id,id>
GET    /duplicates      → 200 { items: [{ id, name, municipality, reasons: ['name_municipality'] }] }   (fazendas.ver + escopo)
         ?name&municipalityIbgeCode&excludeId
GET    /:id             → 200 fazenda com owners, cropIds, aptitudeIds e os derivados  (fazendas.ver + escopo)
GET    /:id/history     → 200 histórico (fundação), filhos: farm_owners, farm_crops, farm_aptitudes
POST   /                → 201 fazenda                                                (fazendas.criar)
PATCH  /:id             → 200 fazenda  (owners, cropIds, aptitudeIds, se presentes, substituem o conjunto)   (fazendas.editar + escopo)
DELETE /:id             → 204                                                        (fazendas.excluir + escopo)
```

- Listas na URL separadas por vírgula; filtro de lista casa com **qualquer** valor escolhido. `region` aceita município **ou** UF, como `buyer_regions`. Schema único em `@crm/shared` (`farmListQuerySchema`), o mesmo da URL do front — o padrão de contatos.
- Ordenação padrão `-createdAt`; sempre terminada em `id`. Ordenar por preço põe as sem preço e as em sacas no fim.
- `responsibleUserId` como filtro só tem efeito com escopo `all` (com `own` o predicado de escopo já restringe).
- Erros: 400 validação (mínimo para salvar, área útil > total, `CHECK` de precificação, coordenada sem par, nenhum ou dois principais, `priceMin`/`priceMax` com `noPrice`); 403 sem permissão ou responsável alheio com escopo `own`; 404 inexistente, de outra empresa ou fora do escopo; 409 exclusão fora de "desativada", concorrência no principal.
- Amostra nova em `apps/api/test/response-sweep.integration.test.ts`.

## Telas e componentes

**`apps/web`** (`modules/farms`):

- **Menu "Fazendas"**, visível com `fazendas.ver`.
- **Lista** em `/e/<tenant>/farms`, sobre a `ListPage`. Filtros principais: busca, região (`MunicipalityPicker` com `allowUf`, múltiplo), status, área (mín/máx na unidade de exibição), valor (mín/máx) e "sem preço"; painel **"Mais filtros"**: praça, aptidões, culturas, potencial de venda, prioridade, situação documental, disponibilidade hídrica, potencial de irrigação, potencial produtivo, distâncias máximas, proprietário (`ContactField` em modo filtro) e corretor responsável (só com escopo `all`).
  - "Sem preço" e o filtro de valor são mutuamente exclusivos: marcar um desativa o outro.
  - O filtro de valor avisa: "Fazendas avaliadas em sacas não entram neste filtro."
  - Colunas: nome, município — UF, área total (unidade de exibição), preço (ou avaliação em sacas, ou "Preço não informado"), status (`Badge`), potencial de venda, prioridade, corretor responsável. Proprietário principal com "+N" quando há mais. Cartão do mobile: `FarmCard`. Botão "Nova fazenda" com `fazendas.criar`.
- **Formulário** (`/farms/new` e `/farms/:id/edit`, sobre `EntityForm`): **uma página** com seções ancoradas — Identificação (nome, município, praça com sugestão, corretor responsável), Proprietários (lista de `ContactField` com papel `owner` e a marca de principal), Áreas (`AreaInput`), Precificação (modo; `MoneyInput` ou sacas + unidade + tipo de alqueire + cultura), Comercial (status, potencial, prioridade), Técnico (aptidões, culturas, níveis, distâncias, situação documental e observação, textos livres, latitude/longitude). Sem wizard. Aviso de duplicata antes de salvar; confirmação ao trocar de modo de precificação com valor preenchido.
- **Ficha** em `/e/<tenant>/farms/:id`, sobre as **seções registráveis** de contatos (o mecanismo passa a servir às duas fichas): esta spec registra **Dados** (os mesmos blocos do formulário, com `SpecList`, e os derivados de preço) e **Histórico de alterações**. Ações editar e excluir conforme as permissões; excluir abre o diálogo de confirmação digitada, ou explica que a fazenda precisa estar desativada.
- **Seção "Fazendas" na ficha do contato**, registrada por este módulo: condicionada ao papel proprietário e a `fazendas.ver`, lista as fazendas de que o contato é proprietário (principal ou não, marcado) **respeitando o escopo** (lista e contagem). Mostra também as desativadas, com o status em `Badge`: é o registro do que o contato tem ou teve na carteira.
- **`FarmField`**: o `FarmPicker` ligado a `/farms/options` da empresa ativa, para os consumidores seguintes (cadeia de indicação, oportunidades).
- **`useUnsavedChangesGuard(isDirty)`**, hook único em `apps/web`: `useBlocker` do react-router (o app usa o data router, `createBrowserRouter`) abre o `ConfirmDialog` "Sair sem salvar?" na navegação interna; `beforeunload` cobre fechar e recarregar a aba (aviso nativo, sem texto próprio). Desligado pelo próprio save bem-sucedido, para o redirecionamento não disparar o aviso. Aplicado ao formulário de fazenda **e** ao de contatos.

**`packages/ui`:**

- **`DuplicateWarning`**, extraído de `apps/web/src/modules/contacts/duplicate-warning.tsx`: recebe título, rótulo acessível, itens `{ id, label, reasons, href }` e o **elemento de link por prop**; "Salvar mesmo assim". O de contatos migra para ele **no mesmo PR** — não ficam duas versões. Story com um e com vários itens.
- **`LevelSelect`**, sobre o primitivo `Select`, com os rótulos de `LEVELS` e a opção vazia ("Não informado"); serve às cinco colunas de nível e, depois, à urgência do perfil de compra (`fase-1-perfil-de-compra`). Story.
- Nenhuma aparência fora das receitas de `styles.ts`.

## Critérios de aceite

**Costuras de teste.** Três, todas já existentes — nenhuma nova:

- **Rotas HTTP contra Postgres real** (projeto `integration`), como `apps/api/test/modules/contacts/*.integration.test.ts`: é onde se provam RLS, escopo de dados, permissões, auditoria, `CHECK`s, concorrência e migrations. A costura mais alta, e a da maioria dos critérios.
- **Funções puras de `packages/shared`** (projeto `unit`), como os testes de `tax-id` e `phone`: `levelCheck`, conversão de área, derivados de preço.
- **Telas com API falsa**, como `apps/web/test/modules/contacts/*.test.tsx`, mais as stories de `packages/ui` em `test/stories.test.tsx`.

Teste exercita comportamento externo — resposta da rota, linha no banco, texto na tela —, nunca a ordem interna das escritas: os passos da diferença ordenada de proprietários são provados pelos casos que quebrariam sem eles (critérios 9 e 10), não por espiar as queries.

Numeração estável: critérios acrescentados depois vão para o fim.

**Cadastro e precificação**

1. **Integração:** criar fazenda só com nome, município, corretor responsável e área total; sem qualquer um deles é 400; a fazenda nasce com o primeiro status ativo `available`.
2. **Integração:** área útil maior que a total é 400; latitude sem longitude é 400.
3. **Integração (banco):** um teste para cada combinação inválida do `CHECK` de precificação — modo nulo com campo de preço; reais sem preço pedido ou com campo de sacas; sacas sem quantidade, unidade ou cultura, ou com preço pedido; `per_alqueire` sem tipo; `per_hectare` com tipo.
4. **Integração:** trocar de reais para sacas apaga o preço pedido no mesmo save, e o histórico guarda o valor anterior; voltar a "sem preço" apaga tudo.
5. **Unitário:** `levelCheck` gera um `CHECK` que aceita exatamente os valores de `LEVELS`; **integração** confere que as cinco colunas recusam valor fora da constante.
6. **Unitário:** ida e volta hectare → alqueire → hectare nos três tipos (goiano, paulista, norte) sem deriva na escala gravada; derivados de preço (valor por hectare e por hectare útil em reais; sacas por hectare a partir de avaliação por alqueire com o tipo congelado).
7. **Front (API falsa):** abrir e salvar uma fazenda com a exibição em alqueire, sem tocar na área, não envia a área.

**Proprietários**

8. **Integração:** incluir proprietários grava `farm_owners`, garante o papel proprietário (idempotente) e registra no histórico; sem principal ou com dois é 400.
9. **Integração:** trocar o principal entre dois proprietários existentes num só `PATCH`; e trocar para um proprietário que entra naquele mesmo save — os dois sem erro, com o histórico mostrando só o que mudou.
10. **Integração:** dois `PATCH` concorrentes trocando o principal da mesma fazenda terminam sem 500, e a fazenda fica com exatamente um principal.
11. **Integração:** retirar o papel proprietário de contato que é proprietário de fazenda é 409 com a contagem; excluir esse contato é 409 com "Este contato é proprietário de fazenda. Remova-o das fazendas antes de excluir."

**Exclusão e desativada**

12. **Integração:** excluir fazenda fora de status `inactive` é 409; desativada, 204, e as junções somem junto; sem `fazendas.excluir`, 403.
13. **Integração:** a migration de semente cria "Desativada" para toda empresa sem `inactive` ativa, usa "Fazenda desativada" na empresa que já tinha o nome "Desativada" com outro significado, e não duplica ao rodar de novo; ao fim, toda empresa tem uma entrada `inactive` ativa. `tenant:provision` cria a entrada.
14. **Integração:** sem parâmetro de status, a lista e o `total` não contam desativadas; com o status desativada pedido, aparecem.

**Escopo de dados** (a prova herdada da `fase-0-permissoes`)

15. **Integração:** usuário com escopo `own` recebe 404 por id direto em detalhe, histórico, `PATCH` e `DELETE` de fazenda de outro responsável; a lista, o `total`, `/options` e `/duplicates` não incluem fazendas alheias; filtrar por proprietário que só tem fazendas alheias devolve lista vazia com `total` 0.
16. **Integração:** com escopo `own`, criar ou editar fazenda com outro corretor responsável é 403.
17. **Integração:** o Gestor (escopo `all`) que é corretor responsável vê a carteira toda; o usuário com dois perfis (`own` + `all`) recebe `all`.
18. **Integração:** a seção de fazendas da ficha do contato respeita o escopo — o Corretor `own` vê só as suas, e a contagem também.
19. **Integração:** fazenda de outra empresa é 404 em toda rota (RLS).

**Listagem e busca**

20. **Integração:** cada filtro do contrato isolado e combinado — região por município e por UF, praça, aptidões e culturas (qualquer uma), área, valor (só em reais), sem preço, status, níveis, situação documental, distâncias, corretor responsável, proprietário (qualquer um, não só o principal); `noPrice` com `priceMin` é 400; ordenações com desempate por `id`.
21. **Integração:** `q` acha por substring sem caixa nem acento ("sant" → "Santa Rita"), em nome, município, proprietário e textos livres.
22. **Integração:** `normalize_text` existe, é `IMMUTABLE`, e os índices de unicidade dos cadastros auxiliares continuam recusando nome repetido sem caixa nem acento depois do rename; **regressão** das buscas de contatos (#128) e municípios com o `searchClause` novo.
23. **Integração:** `/duplicates` acha o mesmo nome sem caixa nem acento no mesmo município e não no município vizinho; `excludeId` tira a própria fazenda.

**Telas**

24. **Front (API falsa):** a lista aplica e reabre filtros pela URL; "sem preço" desativa o filtro de valor e vice-versa; "limpar filtros" volta a "todos menos desativadas".
25. **Front (API falsa):** escolher o município sugere a praça; escolher a praça à mão e depois trocar o município não a sobrescreve.
26. **Front (API falsa):** com escopo `own`, o corretor responsável vem travado no próprio usuário.
27. **Front (API falsa):** o aviso de duplicata de fazenda e o de contatos usam o `DuplicateWarning` de `packages/ui`; "salvar mesmo assim" salva.
28. **Front (API falsa, `createMemoryRouter`):** navegar para fora do formulário sujo (fazenda e contato) abre "Sair sem salvar?"; depois do save bem-sucedido, o redirecionamento não abre.
29. **Front (API falsa):** excluir só habilita com o nome exato digitado; fazenda não desativada mostra a explicação em vez do diálogo.
30. Stories de `DuplicateWarning` e `LevelSelect` passando em `test/stories.test.tsx`.
31. Teste de cobertura de metadados verde com `farms` e as três junções; teste de schema de FK `RESTRICT` dos cadastros auxiliares verde com as FKs novas; `tsc --noEmit` limpo; migrations aplicam de banco zerado; `pnpm lint` verde.
32. No navegador (`pnpm dev`): cadastrar uma fazenda em alqueire com dois proprietários e avaliação em sacas por alqueire; filtrar por UF e aptidão; trocar o principal; desativar e excluir; entrar como Corretor e não ver a fazenda de um colega.

**Referências**

33. **Integração:** contato, cultura, aptidão, praça, status ou cultura de referência de outra empresa é 400; corretor responsável sem vínculo na empresa é 400; trocar para entrada inativa é 400, e salvar sem tocar numa entrada que ficou inativa passa.
34. **Integração:** `/options` não traz desativadas na busca e as devolve por `ids`.

## Fora de escopo

- **Procurador ou gerente da fazenda** ("ou responsável", do escopo) — vai em observação; se o caso aparecer, um `kind` em `farm_owners` é aditivo
- **Faixas de valor nomeadas** — o filtro é mínimo/máximo; faixas são apresentação, da Fase 4
- **Equivalente em reais da avaliação em sacas**, no filtro de valor e na ficha — `fase-1-cotacoes`, que estende o filtro com a cotação vigente da praça
- **Índice trigram** (`pg_trgm`) da busca — quando a medição pedir; não muda query nem contrato
- **Automação do status comercial** por oportunidade e venda — Fase 2
- **Compradores compatíveis** ao cadastrar a fazenda e o envio por WhatsApp/e-mail — matching, Fase 2
- Mapa (`fase-1-fazendas-mapa`), galerias e vídeos (`fase-1-fazendas-galerias`, `-videos`), documentos (`fase-1-fazendas-documentos`), cadeia de indicação (`fase-1-cadeia-de-indicacao`), campos personalizados — só a coluna nasce aqui
- Transferência em lote de carteira entre corretores
- Exportação da lista — Fase 4

## Depende de

`fase-1-fundacao` (metadados, histórico, listagem), `fase-1-municipios` (`municipalities`, `MunicipalityPicker`), `fase-1-configuracoes` (`aptitudes`, `crops`, `trading_posts`, `commercial_statuses`, entrada padrão, sugestão de praça, `tenant_settings`, `TENANT_SEED`) e `fase-1-contatos` (`ContactField`, `ensureContactRole`, `declareRoleUsage`, seções registráveis, `DuplicateWarning` a extrair).
