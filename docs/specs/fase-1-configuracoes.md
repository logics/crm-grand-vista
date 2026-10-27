# Spec — Configurações: cadastros auxiliares e parâmetros da empresa

> **Leitura obrigatória:** `CLAUDE.md`, `CONTEXT.md` (seção "Configurações", e **Alqueire** e **Praça**), `docs/specs/modelo-de-dados.md` (seção 3), `docs/specs/fase-1-fundacao.md` (metadados de campo e padrão de listagem), `docs/specs/fase-0-permissoes.md` (middleware e perfis semeados) e `apps/api/src/provisioning/CLAUDE.md`. Esta spec é autossuficiente — não há histórico de conversa a recuperar.

## Objetivo

O módulo **Configurações**, com duas partes:

1. **Motor de cadastros auxiliares** — uma rota e uma tela parametrizadas pelo cadastro, que servem a todos os cadastros auxiliares da Fase 1 e em que os das fases seguintes (etapas do funil, status da venda, tipos de atividade) só se registram. Inclui as três características que variam entre cadastros: **ordem** (alfabética ou manual), **significado de sistema** e **campos extras** (os municípios atendidos pela praça).
2. **Parâmetros da empresa** — `tenant_settings`, com **só** o tipo de alqueire padrão e a unidade de exibição de área. As demais colunas do modelo entram, com a sua tela, na spec que as consome.

Mais a **semente** dos cadastros auxiliares e dos parâmetros, aplicada uma vez por empresa.

## Vocabulário

`CONTEXT.md`: **Cadastro auxiliar** (e **entrada**), **Entrada inativa**, **Significado de sistema**, **Parâmetros da empresa**, **Alqueire**, **Praça**, **Status comercial**, **Empresa ativa**, **Permissão**.

"Vocabulário" (`vocabulary`) é só o identificador em código. Na tela, o grupo se chama **Cadastros auxiliares** e cada item do menu leva o nome do cadastro ("Culturas", "Praças").

## Decisões que governam

- `docs/specs/modelo-de-dados.md`, seção 3 — forma comum dos cadastros auxiliares; significado de sistema como `text` + `CHECK`; sem soft delete, `active` explícito; migrations entre fases somente aditivas
- `fase-1-fundacao.md` — contrato de listagem (página, total, ordenação terminando em `id`, busca com `unaccent`), estado na URL, página de lista; histórico resolve referência pelo **nome atual** e "(registro excluído)" quando não existe mais; contexto de exibição de área já existe na formatação, esperando ser preenchido
- `fase-0-permissoes.md` — `configuracoes.gerenciar` já está no catálogo; Admin e Gestor a recebem pela regra dos perfis semeados, o Corretor não
- `apps/api/src/provisioning/CLAUDE.md` — o provisionamento é uma transação só, pelo caminho do CLI, com autor nulo

## Modelo de dados

### Cadastros auxiliares da Fase 1

Todos com a **forma comum**: `id`, `tenant_id`, `name` text, `display_order` int NOT NULL DEFAULT 0, `active` boolean NOT NULL DEFAULT true, timestamps, RLS.

| Tabela | Chave na URL | Rótulo | Ordem | Extra |
|---|---|---|---|---|
| `aptitudes` | `aptitudes` | Aptidões | alfabética | — |
| `crops` | `crops` | Culturas | alfabética | — |
| `trading_posts` | `trading-posts` | Praças | alfabética | municípios atendidos |
| `lead_sources` | `lead-sources` | Origens do lead | alfabética | — |
| `document_categories` | `document-categories` | Categorias de documento | alfabética | — |
| `payment_methods` | `payment-methods` | Formas de pagamento | alfabética | — |
| `contact_classifications` | `contact-classifications` | Classificações do cliente | alfabética | — |
| `purchase_profiles` | `purchase-profiles` | Perfis de compra | alfabética | — |
| `commercial_statuses` | `commercial-statuses` | Status comercial | **manual** | `system_meaning` NOT NULL CHECK `('available','negotiating','sold','suspended')` |

**Unicidade do nome** sem distinguir caixa nem acento: índice único em `(tenant_id, <nome normalizado>)`, em que a normalização é `lower` + `unaccent` através de uma função `IMMUTABLE` que envolve o `unaccent` (o próprio `unaccent` não é imutável e não entra em índice). O nome é gravado como digitado, sem espaços nas pontas.

**`trading_post_municipalities`** — os municípios atendidos por uma praça: `id`, `tenant_id`, `trading_post_id` → `trading_posts` ON DELETE CASCADE, `municipality_ibge_code` → `municipalities`, timestamps, RLS. UNIQUE `(tenant_id, municipality_ibge_code)`: um município é atendido por **no máximo uma** praça da empresa.

**FKs para cadastros auxiliares** — as desta spec e as de toda spec consumidora — são `ON DELETE RESTRICT`. É o banco que diz "em uso", inclusive para consumidores que ainda não existem.

### `tenant_settings`

`tenant_id` PK (1:1), `default_alqueire_type` text NOT NULL DEFAULT `'goiano'` CHECK `('goiano','paulista','norte')`, `area_display_unit` text NOT NULL DEFAULT `'hectare'` CHECK `('hectare','alqueire')`, timestamps, RLS. As demais colunas da seção 3 do modelo entram como colunas novas, com default, nas specs que as consomem.

### Semente

Migration única para as empresas existentes (Postgres 18 tem `uuidv7()` nativo) e a mesma semente no `tenant:provision`, dentro da transação da empresa. A lista vive numa constante em `packages/shared`, fonte das duas.

- **Status comercial**, nesta ordem: Disponível (`available`), Em negociação (`negotiating`), Vendida (`sold`), Suspensa (`suspended`)
- **Categorias de documento:** CAR, CCIR, Contratos, Georreferenciamento, Laudos, Licenças, Mapas, Matrículas
- **Culturas:** Algodão, Café, Cana-de-açúcar, Milho, Pecuária, Soja
- **Parâmetros:** a linha de `tenant_settings` com os defaults
- Os demais cadastros nascem **vazios**

## Regras de negócio

### Registro de cadastros auxiliares

Um registro em `packages/shared` declara cada cadastro: chave da URL, tabela, rótulo no singular e no plural, gênero, modo de ordem, significados de sistema (valor e rótulo, quando houver) e campos extras. É o ponto único de extensão: um cadastro da Fase 2 é uma entrada nesse registro mais a sua migration, sem tocar rota nem tela. Chave fora do registro é **404**.

As tabelas entram no registro de metadados de campo (o teste de cobertura da fundação obriga): `name`, `active`, `system_meaning` (lista fechada, com os rótulos de exibição) e `display_order` (oculto no histórico).

### Entradas

- **Nome:** obrigatório, até 100 caracteres, sem espaços nas pontas. Nome repetido (ignorando caixa e acento) é recusado com **409** e diz se a entrada existente está inativa — "Já existe uma entrada inativa com esse nome; reative-a" —, para o usuário reativar em vez de duplicar.
- **Exclusão física** só de entrada nunca usada. A recusa vem da FK `RESTRICT`: **409** "Esta entrada está em uso. Desative-a para que não apareça em novos cadastros." O histórico não conta como uso — ali a entrada excluída aparece como "(registro excluído)".
- **Desativar e reativar** a qualquer momento, sujeito à regra do significado abaixo.

### Ordem

- **Alfabética:** ordenada pelo nome com a collation pt-BR do ICU, que ignora caixa e acento ("Água" junto do "A"). `display_order` fica em 0 e é ignorado; a tela não oferece reordenação.
- **Manual:** ordenada por `display_order`, depois pelo nome. Entrada nova entra **no fim**. A reordenação recebe a lista completa de ids na nova ordem e regrava, numa transação, o `display_order` só das linhas que mudaram — um `change_id` para a reordenação inteira. Lista que não corresponde exatamente às entradas do cadastro é **400**. Cadastro manual tem no máximo **50** entradas: ordem de fluxo é curta, e a tela dele não pagina.

Mudar o modo de um cadastro é editar o registro, sem migration: as entradas com `display_order` 0 empatam e ficam pela ordem do nome.

### Significado de sistema

- Escolhido na **criação** e **imutável**: o `PATCH` não aceita o campo (400). Para mudar, cria-se outra entrada e migram-se os registros.
- **Cada significado mantém ao menos uma entrada ativa.** Desativar ou excluir a última ativa de um significado é **409**: "Precisa haver ao menos um status ativo com o significado Vendida."
- **Entrada padrão:** a primeira ativa de um significado, na ordem do cadastro, é a que um registro novo recebe por padrão. O motor expõe essa leitura; quem a aplica é a spec consumidora (fazenda nova nasce com o primeiro status `available`).

### Praça e municípios atendidos

- A praça se edita no mesmo diálogo das demais, com o campo extra **Municípios atendidos** (`MunicipalityPicker` múltiplo). Gravar nome e municípios é um save só.
- Incluir um município já atendido por outra praça é **409**, nomeando-a: "Rio Verde (GO) já é atendido pela praça Jataí."
- **Praça inativa mantém os seus municípios** — continuam reservados a ela — mas não é sugerida a nenhuma fazenda. Para passar um município a outra praça, tira-se da antiga primeiro.
- A **sugestão** de praça pelo município é uma leitura deste módulo; a regra de quando sugerir e de nunca reatribuir fazenda salva é de `fase-1-fazendas`.

### Entradas inativas nas leituras

| Onde | Inativas |
|---|---|
| Opções de formulário (criar, editar) | não aparecem; a entrada já gravada num registro continua exibida, pela hidratação por id |
| Opções de filtro de listagem | aparecem, marcadas "inativa", depois das ativas |
| Tela de administração do cadastro | aparecem, com filtro ativas / inativas / todas |

### Parâmetros

- **Tipo de alqueire padrão:** é só o **pré-preenchimento** das entradas em alqueire e a referência de exibição. Trocá-lo **nunca** reinterpreta valor gravado — todo valor gravado por alqueire congela o próprio tipo (ver `modelo-de-dados.md`, `farms.valuation_bags_alqueire_type`).
- **Unidade de exibição de área:** hectare ou alqueire (do tipo padrão). Preenche o contexto de exibição que a fundação já passa à formatação — no front e na formatação do histórico na API — sem mudar assinatura.

### Acesso

- **Leitura** de opções, entrada padrão, sugestão de praça e parâmetros: qualquer usuário com vínculo na empresa ativa, sem permissão específica — é dado de apoio para preencher e exibir cadastros.
- **Escrita** (criar, renomear, desativar, reativar, excluir, reordenar, editar parâmetros) e a **listagem de administração**: `configuracoes.gerenciar`. Sem ela, 403 antes de tocar o banco.
- O menu Configurações só aparece para quem tem `configuracoes.gerenciar`.

### Auditoria

Toda escrita passa pelo wrapper de auditoria, inclusive a semente do provisionamento (autor nulo, "Sistema"). A migration da semente nas empresas existentes não passa pelo wrapper. Não há tela de histórico por entrada nesta spec; as alterações ficam para os logs de auditoria.

## Contratos de API

Todas sob `/e/:tenant/settings`. `:vocabulary` é a chave da URL do registro.

```
GET    /vocabularies                                  → 200 [{ key, label, orderMode, hasSystemMeaning }]   (configuracoes.gerenciar — monta o menu)
GET    /vocabularies/:vocabulary                      → 200 listagem padrão { items, total, page, pageSize }
         ?page&pageSize&sort=name|-name&q&status=active|inactive|all     (configuracoes.gerenciar; manual: sem paginação, ordem do cadastro)
GET    /vocabularies/:vocabulary/options              → 200 { items: [{ id, name, active, systemMeaning? }], nextCursor? }
         ?q&cursor&includeInactive=true&ids=<id,id>   (vínculo; ids hidrata valor gravado, ativo ou não)
GET    /vocabularies/:vocabulary/defaults             → 200 { [systemMeaning]: { id, name } | null }   (vínculo)
POST   /vocabularies/:vocabulary                      → 201 entrada   (name, systemMeaning?, extras)
PATCH  /vocabularies/:vocabulary/:id                  → 200 entrada   (name?, active?, extras?)
DELETE /vocabularies/:vocabulary/:id                  → 204
PUT    /vocabularies/:vocabulary/order                → 204   ({ ids: [...] }; só cadastro manual, senão 400)
GET    /trading-posts/suggestion?municipality=<ibge>  → 200 { tradingPost: { id, name } | null }   (vínculo; ignora praça inativa)
GET    /                                              → 200 { defaultAlqueireType, areaDisplayUnit }   (vínculo)
PATCH  /                                              → 200 parâmetros   (configuracoes.gerenciar)
```

Respostas de praça trazem `municipalities: [{ ibgeCode, name, uf }]`. Erros: 400 validação, 403 sem permissão, 404 cadastro ou entrada inexistente (inclusive de outra empresa), 409 nas recusas de regra acima, com a mensagem pronta para exibir.

## Telas e componentes

**`apps/web`** (`modules/settings`):

- **Configurações** em `/e/<tenant>/settings`, com navegação lateral (`SidebarNav`): "Parâmetros" e o grupo **Cadastros auxiliares**, um item por cadastro do registro, em ordem alfabética.
- **Cadastro auxiliar** em `/e/<tenant>/settings/vocabularies/<key>`: a página de lista da fundação, com busca e filtro de situação; coluna "Significado" quando há; coluna "Municípios atendidos" (contagem) na praça. Ações na linha: editar, desativar/reativar, excluir (`ConfirmDialog`). Cadastro manual: sem paginação, com reordenação por arrastar **e** por teclado (mover para cima / para baixo).
- **Diálogo de entrada:** nome; significado (só na criação; depois, exibido sem edição); campos extras. As mensagens de 409 aparecem no diálogo, sem fechar.
- **Parâmetros** em `/e/<tenant>/settings/parameters`: os dois campos, salvar.
- **Contexto de exibição:** os parâmetros carregados uma vez por empresa ativa (TanStack Query) e entregues à formatação de área.

**`packages/ui`:**

- **`VocabularyPicker`** — o seletor de entrada de um cadastro auxiliar, sobre `AsyncCombobox`, consumindo `/options`: modo formulário (sem inativas, hidrata o valor gravado) e modo filtro (inativas marcadas, depois das ativas). É o que contatos e fazendas usam; nenhum módulo escreve o seu
- Lista reordenável acessível, se nenhum componente existente servir — a etapa do funil (Fase 2) reaproveita
- Stories das variantes; nenhuma aparência fora das receitas de `styles.ts`

## Critérios de aceite

**Motor e entradas**

1. **Integração:** criar, renomear, desativar, reativar e excluir uma entrada em cada modo de ordem; cadastro fora do registro é 404.
2. **Integração:** "soja" e "Sója" são recusadas com 409 diante de "Soja"; a mensagem distingue entrada inativa.
3. **Integração:** excluir entrada referenciada é 409 e excluir entrada nunca usada é 204. Como nenhum consumidor existe ainda, o teste cria na própria transação uma tabela com FK `RESTRICT` para o cadastro — a rota e a tradução da violação de FK são as de produção.
4. **Teste de schema:** toda FK para uma tabela do registro de cadastros auxiliares é `ON DELETE RESTRICT`; falha diante de `CASCADE` ou `SET NULL` — é o que garante a regra às specs consumidoras.
5. **Integração:** `PATCH` com `systemMeaning` é 400; desativar e excluir a última ativa de um significado são 409; com duas ativas, desativar uma passa.
6. **Integração:** `/defaults` devolve a primeira ativa de cada significado na ordem manual, e muda quando a ordem muda.
7. **Integração:** reordenação regrava só as linhas que mudaram, com um `change_id` só; lista incompleta ou com id estranho é 400; reordenar cadastro alfabético é 400; o 51º status comercial é recusado.
8. **Integração:** ordem alfabética põe "Água" entre "Abacaxi" e "Algodão".

**Opções e acesso**

9. **Integração:** `/options` sem `includeInactive` não traz inativas; com, traz marcadas e depois das ativas; `ids` hidrata entrada inativa.
10. **Integração:** usuário sem `configuracoes.gerenciar` lê opções, defaults, sugestão e parâmetros, e recebe 403 em toda escrita e na listagem de administração.
11. **Integração:** entrada de outra empresa é 404 em toda rota (RLS), e a unicidade do nome é por empresa — duas empresas têm cada uma a sua "Soja".

**Listagem (prova herdada da fundação)**

12. **Integração:** a listagem de administração pagina com `total` correto, ordena por nome com desempate por `id`, busca "acucar" acha "Cana-de-açúcar" e filtra por situação — atendendo o critério 19 da `fase-1-fundacao`.

**Praça**

13. **Integração:** criar praça com municípios num save só; município já atendido por outra praça é 409 nomeando-a; excluir a praça remove os seus municípios.
14. **Integração:** `/trading-posts/suggestion` devolve a praça ativa que atende o município, `null` para município sem praça e `null` quando a praça está inativa.

**Parâmetros e semente**

15. **Integração:** `tenant:provision` cria a linha de parâmetros e a semente na mesma transação, auditada com autor nulo; falha no meio não deixa nada.
16. **Unitário:** a migration da semente contém exatamente os valores da constante de `packages/shared`.
17. **Integração:** trocar a unidade de exibição para alqueire faz o histórico formatar área em alqueire do tipo padrão.
18. **Integração:** `PATCH /` aceita só os valores do `CHECK`; sem permissão é 403.

**Telas**

19. Stories do `VocabularyPicker` (formulário, filtro com inativa, valor inativo hidratado) e da lista reordenável, passando em `test/stories.test.tsx`.
20. Teste de cobertura de metadados verde com as tabelas novas registradas; `tsc --noEmit` limpo; migrations aplicam de banco zerado; `pnpm lint` verde.
21. Fluxo exercitado no navegador via `pnpm dev`: criar uma cultura, renomear, desativar e ver que some do seletor de formulário e aparece no de filtro; reordenar o status comercial pelo teclado.

## Fora de escopo

- Exclusão com substituição ("excluir Soja e passar os registros para Soja Safrinha") — entra depois sem retrabalho
- Contagem de uso por entrada na tela de administração
- Tela de histórico por entrada e tela de logs de auditoria
- As demais colunas de `tenant_settings` (moeda, base de precificação, comissão padrão, limiares de inércia) — cada uma com a spec que a consome
- Cadastros auxiliares das fases seguintes: `pipeline_stages` e `sale_statuses` (Fase 2), `activity_types` (Fase 3) — só se registram no motor
- Aplicação da sugestão de praça e da entrada padrão nos formulários — `fase-1-fazendas`
- Tipo de galeria — não existe; a galeria tem só nome (`fase-1-fazendas-galerias`)

## Depende de

`fase-1-fundacao` (metadados de campo, padrão de listagem, contexto de exibição) e `fase-1-municipios` (`municipalities`, `MunicipalityPicker` com dados reais).
