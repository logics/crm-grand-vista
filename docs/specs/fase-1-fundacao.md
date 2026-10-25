# Spec — Fundação da Fase 1: metadados de campo, histórico de alterações e padrão de listagem

> **Leitura obrigatória:** `CLAUDE.md`, `CONTEXT.md`, `docs/specs/modelo-de-dados.md`, `docs/specs/fase-0-banco-e-rls.md` (seção do wrapper de auditoria), `docs/specs/fase-0-permissoes.md` (escopo de dados e 404) e a seção "Metadados de campo (DRY)" do `Plano_Geral_de_Desenvolvimento.md`. Esta spec é autossuficiente — não há histórico de conversa a recuperar.

## Objetivo

Três peças transversais que todo módulo da Fase 1 consome, entregues antes do primeiro módulo de negócio para nascerem com uma forma só:

1. **Registro de metadados de campo** em `packages/shared` — o único lugar que diz o rótulo, o tipo e a formatação de cada campo de cada entidade.
2. **Histórico de alterações** — a leitura do `audit_log` de um registro e dos seus filhos, pronta para exibir, montável por qualquer módulo sob o próprio recurso.
3. **Padrão de listagem** — contrato de paginação, ordenação, busca e filtro; helper de consulta no servidor; estado na URL e página de lista no front.

Nenhuma delas tem tela de negócio própria. A prova de integração do histórico usa `users`, a única entidade auditada por rota que já existe; a da listagem é critério de aceite de `fase-1-configuracoes`, a primeira consumidora.

## Vocabulário

`CONTEXT.md`: **Auditoria**, **Histórico de alterações**, **Logs de auditoria**, **Escopo de dados**, **Super admin**, **Hectare**, **Alqueire**.

Histórico de alterações e logs de auditoria são vistas diferentes do mesmo `audit_log`: o histórico é de **um registro**, na ficha, com a permissão do módulo; os logs são da **empresa inteira**, com `auditoria.ver`. Esta spec entrega só o histórico.

## Decisões que governam

- `docs/specs/modelo-de-dados.md` — `audit_log` (`entity` é o nome da tabela, `field` o nome da coluna, valores em `text`, `change_id` agrupa um save); exclusão física, sem soft delete
- `fase-0-banco-e-rls.md` — o wrapper de auditoria grava uma linha por campo alterado; no insert, todo campo preenchido; no delete, todo campo como valor anterior
- `fase-0-permissoes.md` — escopo de dados aplicado pela mesma cláusula na listagem e no detalhe; registro fora do escopo é **404**
- Super admin aparece como usuário comum em toda listagem (invariante da Fase 0)

## Modelo de dados

Nenhuma tabela nova. Uma migration instala a extensão **`unaccent`** (marcada como *trusted* desde o Postgres 13, instalável pelo `crm_owner`), usada pela busca textual.

## Regras de negócio

### Registro de metadados de campo

**Chave: tabela + coluna do banco** — exatamente o que o `audit_log` grava em `entity` e `field`. O nome em camelCase (o das respostas da API e dos formulários) é **derivado mecanicamente**, pela mesma conversão do Drizzle, nunca declarado de novo. Chavear pelo banco é o que deixa o histórico ler o que está gravado.

**Por entidade:** rótulo no singular e **gênero gramatical** (`'f' | 'm'`). O gênero existe para os títulos do histórico — "Fazenda cadastrad**a**", "Contato cadastrad**o**" — e é o que impede "cadastrado(a)" na tela.

**Por campo**, na **ordem do formulário** (é a ordem em que aparecem no histórico): rótulo e tipo, e o gênero do rótulo quando é feminino — "Foto alterad**a**" no título de uma alteração só; omitido, é masculino. Tipos:

| Tipo | Formatação | Observação |
|---|---|---|
| texto | como está | |
| texto longo | como está | truncado no histórico, com "ver tudo" |
| número | `formatDecimal` | |
| dinheiro | `formatMoney` | |
| área | na unidade do contexto de exibição | gravada sempre em hectares |
| percentual | `formatPercent` | |
| data | `dd/mm/aaaa` | sem fuso: é data, não instante |
| booleano | "Sim" / "Não" | |
| lista fechada | rótulo de cada valor | ex.: `sales_potential` `high` → "Alto" |
| referência | nome atual do registro referenciado | declara a tabela e a coluna de nome |
| jsonb expandido | uma alteração por chave | **ponto de extensão**, ver abaixo |
| oculto | — | não aparece no histórico (`id`, `tenant_id`, `r2_key`…) |

**Contexto de exibição.** A formatação recebe, desde já, um contexto com a unidade de área e o tipo de alqueire. Nesta spec o contexto é sempre hectare; `fase-1-configuracoes` passa a preenchê-lo a partir de `tenant_settings`, sem mudar assinatura.

**Ponto de extensão "jsonb expandido".** Um campo jsonb cujas chaves têm rótulos que **não estão em código** (`custom_fields`, cujos rótulos vêm de `custom_field_defs`, dado da empresa). O tipo declara um resolvedor que, dado o JSON anterior e o novo, devolve uma alteração por chave com rótulo e valores formatados. Esta spec define o tipo e o caminho de execução; a implementação para `custom_fields` é de `fase-1-campos-personalizados`. Até lá a coluna é declarada como oculta.

**Teste de guarda de cobertura.** Um teste varre **todas as tabelas do schema Drizzle** e falha se alguma coluna não tiver metadado nem for declarada oculta — com uma lista **nominal** de tabelas excluídas, cada uma com o motivo (tabelas da biblioteca de autenticação, `audit_log`, catálogo de permissões, tabelas de junção sem `id`). É o que impede a próxima coluna esquecida de aparecer como `water_availability` crua na tela; o mesmo raciocínio do teste de schema que obriga RLS. Esta spec registra as entidades que já existem e são auditadas: `users`, `tenants`, `memberships`, `access_profiles`. Cada spec seguinte registra as suas tabelas — o teste não deixa esquecer.

**A flag de super admin não entra no registro.** `packages/shared` não pode nomeá-la (`test/no-super-admin-flag.test.ts`). O teste de cobertura ignora as colunas que o wrapper já trata como só de plataforma (o conjunto em `@crm/db`), e o histórico de empresa nunca as recebe: o wrapper não as grava em linha com `tenant_id`.

**Consumidores.** Rótulos de formulário, cabeçalhos de tabela e filtros leem o mesmo registro. Um rótulo muda em um lugar só.

### Histórico de alterações

**Montagem por módulo.** Um serviço compartilhado lê e monta o histórico; uma fábrica de rota o expõe. Cada módulo monta a rota **sob o próprio recurso** (`GET /farms/:id/history`) e entrega a ela a sua verificação de visibilidade do registro — a mesma do detalhe. Não há rota genérica `/history/:entity/:id`: ela teria de reimplementar fora de cada módulo a permissão e o escopo de dados, e é por essa duplicação que um Corretor de escopo `own` leria o histórico da fazenda de um colega.

**Permissão.** A do módulo (`fazendas.ver` + escopo). Registro invisível para o usuário é **404**, como no detalhe. `auditoria.ver` não é exigida aqui.

**Filhos declarados.** O módulo declara, além do registro, as tabelas filhas e a coluna que aponta para o pai (`farm_documents.farm_id`). O histórico inclui as alterações dos filhos **mesmo depois de excluídos**: a exclusão grava todos os campos como valor anterior, inclusive a coluna do pai, então o filho é encontrado por ela.

**Filtro de visibilidade por filho.** Cada filho declarado pode trazer um filtro que recebe o leitor e a linha e decide se ela aparece. É o ponto de extensão da quarta camada de controle: na Fase 2, os participantes da comissão são filhos da venda, e sem `comissao.ver_de_terceiros` o leitor só vê a própria linha. Linha filtrada some **por inteiro** — não conta no título ("2 alterações") nem deixa entrada vazia.

**Uma entrada por save.** Agrupada por `change_id`, mais nova primeiro. Registro e filhos alterados no mesmo envio ficam na mesma entrada; cada filho é uma linha própria ("Documento adicionado: Matrícula 12.345").

**Título** (gênero do registro):

| Situação | Título |
|---|---|
| insert do registro | "Fazenda cadastrada" |
| delete do registro | "Fazenda excluída" |
| um campo alterado | "Preço pedido alterado" |
| vários campos e/ou filhos | "3 alterações" |
| só um filho incluído / excluído | "Documento adicionado" / "Documento removido" |

**Cadastro.** A entrada "Fazenda cadastrada" traz os valores iniciais **recolhidos**, abertos por "ver valores iniciais". Os valores já estão na ficha; listá-los abertos empurra para baixo o que importa — o que mudou depois.

**Valores prontos para exibir.** A API devolve rótulo do campo, valor anterior e valor novo **já formatados** em pt-BR, com as referências resolvidas. A API é contrato para integrações: quem a consome lê o histórico como o usuário o lê.

- Referência resolvida pelo **nome atual** do registro referenciado (status renomeado aparece com o nome de hoje). Registro referenciado que não existe mais aparece como "(registro excluído)".
- **Exceção: o instante da entrada** vai em ISO 8601 (UTC), e o front o formata no fuso do navegador ("24/07 · 14h30"). A Grand Vista atua em mais de um fuso (GO em UTC−3, MT em UTC−4), e o instante é o único dado cuja forma certa depende de quem lê. Campos do tipo data não são instante e vêm formatados.
- Texto longo vem inteiro; o truncamento e o "ver tudo" são do componente.

**Autor.** `user_id` nulo (CLI ou sistema) é "Sistema". Usuário sem vínculo atual com a empresa aparece pelo nome. O super admin aparece **pelo nome**, sem marcação — escondê-lo aqui o revelaria por contraste.

**Paginação por cursor**, 20 saves por página, com "carregar mais". O cursor é por save, não por linha de `audit_log`: uma página nunca corta um save ao meio.

### Padrão de listagem

**Parâmetros**, validados por um schema Zod base composto com o schema de filtros de cada módulo:

- `page` — a partir de 1
- `pageSize` — 25, 50 ou 100; padrão 25; outro valor é recusado (400)
- `sort` — `campo` ou `-campo`, só entre os campos que a lista declara ordenáveis; outro é recusado (400). Toda ordenação termina em `id`, para que registros com o mesmo valor não troquem de página entre consultas
- `q` — busca textual, **insensível a acento e a maiúsculas** (`unaccent` + `ILIKE`) nas colunas que o módulo declara. "joao" acha "João"; "sao jose" acha "São José do Rio Claro"
- filtros próprios do módulo, como parâmetros simples

**Resposta:** `{ items, total, page, pageSize }`. Página além do fim devolve `items` vazio com o `total` verdadeiro — a `Pagination` ajusta sozinha.

**Por que página + total, e não cursor:** os volumes são de centenas a poucos milhares de registros por empresa (`count(*)` barato), e o corretor quer "página 3 de 12" e um link que reabre a mesma página. Cursor fica onde a lista só cresce para baixo: `AsyncCombobox` e o histórico.

**Escopo de dados.** O helper de consulta recebe o predicado de escopo do módulo e o aplica **também no `count`** — total que conta registros invisíveis revela o tamanho da carteira dos colegas.

**Estado na URL.** Página, tamanho, ordenação, busca e filtros vivem nos parâmetros da URL (`/e/gv/farms?page=2&sort=-totalAreaHa&q=rio`), lidos e escritos por um hook único no front, validados pelo **mesmo schema** da API. Voltar funciona; link copiado reabre a mesma lista. Parâmetro inválido na URL cai no padrão em vez de quebrar a tela.

## Contratos de API

**Histórico de um registro** (montado por cada módulo; o primeiro é o de usuário):

```
GET /e/:tenant/<recurso>/:id/history?cursor=<opaco>
→ 200 {
    entries: [{
      changeId, at /* ISO 8601 UTC */, author /* nome ou "Sistema" */,
      kind /* 'created' | 'updated' | 'deleted' */, title,
      changes: [{ field /* rótulo */, from, to /* texto formatado ou null */, long? }],
      children: [{ title, changes: [...] }]
    }],
    nextCursor?
  }
→ 400 cursor que não foi emitido pela API
→ 404 registro inexistente, fora do escopo de dados ou com id malformado
```

Na entrada de cadastro, `changes` são os valores iniciais (o componente os mostra recolhidos).

**Histórico de usuário:** `GET /e/:tenant/users/:id/history`, com `usuarios.gerenciar`, dispensada quando o alvo é o próprio usuário — a mesma regra e a mesma recusa (403 antes de tocar o banco) do `PATCH /users/:id`. Usuário sem vínculo com a empresa é 404. Ganha amostra em `apps/api/test/response-sweep.integration.test.ts`.

**Listagem:** sem rota nesta spec — o contrato acima é o que toda listagem de módulo adota, a começar por `fase-1-configuracoes`.

## Telas e componentes

**`packages/ui`:**

- `AuditTimeline` ganha, por entrada, uma lista de campos **recolhível** com rótulo próprio ("ver valores iniciais"), e o tratamento de **texto longo** (uma linha truncada, "ver tudo" abre o valor anterior e o novo completos, um embaixo do outro). Story para cada variante; regra de lint de variante atualizada se houver
- Nenhum outro componente novo

**`apps/web`:**

- **Hook de estado de listagem na URL**, parametrizado pelo schema Zod da lista
- **Página de lista**: compõe `SearchBar` + `DataTable` + `Pagination` + o hook + os estados de carregamento, vazio e erro (`page-state`). O módulo fornece colunas, controles de filtro (como filhos) e o cartão da versão mobile — a `DataTable` não serve no mobile. Fica em `apps/web` e não em `packages/ui` porque depende do roteador e do TanStack Query; `packages/ui` é apresentação
- **Histórico de um registro**: componente que consome a rota de histórico do recurso, formata o instante no fuso do navegador e entrega à `AuditTimeline`, com "carregar mais"

Filtros **não** são gerados a partir dos metadados: os reais (área digitada em alqueire, município **ou** UF, faixa de valor que depende do modo de precificação) não saem do tipo do campo, e o gerador viraria uma DSL.

## Critérios de aceite

**Metadados de campo**

1. **Unitário:** cada tipo formata como a tabela de tipos; área formata em hectares e, com outro contexto de exibição, em alqueire do tipo dado.
2. **Unitário:** o nome camelCase de cada campo é derivado da coluna, igual ao do Drizzle.
3. **Teste de cobertura:** falha quando uma coluna de tabela do schema não tem metadado nem está oculta, e quando uma tabela fora da lista nominal de exclusões não está registrada. Passa com `users`, `tenants`, `memberships` e `access_profiles` registradas.
4. O teste de cobertura não exige metadado para as colunas só de plataforma, e `packages/shared` continua sem nomear a flag de super admin (`test/no-super-admin-flag.test.ts` verde).

**Histórico de alterações**

5. **Integração:** após `PATCH /users/:id`, `GET /users/:id/history` devolve uma entrada por save, mais nova primeiro, com rótulo legível e valores formatados — nunca nome de coluna.
6. **Integração:** dois campos alterados no mesmo save saem numa entrada só, na ordem do registro, com o título "2 alterações"; um campo, com o título do campo.
7. **Integração:** a entrada de cadastro traz o título com o gênero da entidade e os valores iniciais.
8. **Integração:** usuário sem `usuarios.gerenciar` lê o próprio histórico e recebe 403 no de outro; usuário de outra empresa é 404.
9. **Integração:** alteração feita por CLI aparece com autor "Sistema"; alteração feita pelo super admin aparece com o nome dele, sem marcação, e a resposta passa pela varredura de flag.
10. **Integração:** o instante sai em ISO 8601 UTC.
11. **Integração:** paginação por cursor nunca corta um save ao meio, e a última página não traz `nextCursor`.
12. **Unitário** (montagem do histórico a partir de linhas de `audit_log`): filhos declarados entram na entrada do mesmo `change_id`; filho excluído é encontrado pela coluna do pai no valor anterior; referência inexistente vira "(registro excluído)".
13. **Unitário:** linha barrada pelo filtro de visibilidade não aparece nem conta no título; entrada que fica sem nenhuma alteração visível some.
14. **Unitário:** o ponto de extensão "jsonb expandido" transforma um JSON anterior e um novo em uma alteração por chave, com o rótulo do resolvedor.

**Padrão de listagem**

15. **Unitário:** o schema base recusa `pageSize` fora de 25/50/100 e `sort` fora dos campos declarados; aplica os padrões; compõe com um schema de filtros de módulo.
16. **Unitário:** a ordenação montada termina sempre em `id`, inclusive sem `sort`.
17. **Integração** (migration): `unaccent` instalada pelo `crm_owner`, e a busca "joao" encontra "João" numa consulta real.
18. **Unitário (front):** o hook lê e escreve página, ordenação, busca e filtros na URL; parâmetro inválido cai no padrão.
19. A prova de integração da listagem — página, total, ordenação, busca sem acento e escopo aplicado também no `count` — é **critério de aceite de `fase-1-configuracoes`**, a primeira lista real.

**Componentes**

20. Stories da `AuditTimeline` com lista recolhida e com texto longo, passando em `test/stories.test.tsx`.
21. `tsc --noEmit` limpo; migrations aplicam de banco zerado; `pnpm lint` verde.

## Fora de escopo

- **Tela de logs de auditoria** da empresa (`auditoria.ver`) — fica para uma fase posterior; o glossário já separa os dois conceitos
- Índice trigram (`pg_trgm`) para a busca — quando o volume pedir; não muda contrato
- Filtros gerados automaticamente a partir dos metadados
- Diff palavra a palavra em texto longo
- Converter `GET /users` (equipe, seletor de responsável) para o padrão de listagem — ninguém precisa paginar ali
- Unidade de área configurável pela empresa — o contexto de exibição nasce aqui, mas quem o preenche é `fase-1-configuracoes`
- Resolvedor de `custom_fields` — `fase-1-campos-personalizados`
- Filtro de visibilidade da comissão — Fase 2; aqui só o ponto de extensão

## Depende de

Fase 0 completa: o wrapper de auditoria (`fase-0-banco-e-rls.md`), a resolução de empresa e o `PATCH /users/:id` (`fase-0-autenticacao-e-contexto.md`), o middleware de permissão e a cláusula de escopo (`fase-0-permissoes.md`), e `AuditTimeline`, `DataTable`, `Pagination` e `SearchBar` (`design-system.md`).
