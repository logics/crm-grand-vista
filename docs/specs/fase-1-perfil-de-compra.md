# Spec — Perfil de compra

> **Leitura obrigatória:** `CLAUDE.md`, `CONTEXT.md` (seção "Cliente/comprador" — **Perfil de compra**, **Grau de qualificação**, **Ticket médio / ticket máximo**, **Capacidade de investimento**, **Patrimônio estimado**, **Região de interesse** —, e **Comprador**, **Histórico de alterações**, **Cadastro auxiliar**, **Entrada inativa**), `docs/specs/modelo-de-dados.md` (convenções e seção 4: `buyer_profiles`, `buyer_regions`, `buyer_crops`, `buyer_payment_methods`), `docs/specs/fase-1-contatos.md` (papéis, dados exclusivos do papel, seções registráveis, contrato da API), `docs/specs/fase-1-fundacao.md` (metadados de campo, histórico, padrão de listagem), `docs/specs/fase-1-configuracoes.md` (cadastros auxiliares, `VocabularyField`, semente), `docs/specs/fase-1-municipios.md` (região município-ou-UF, `MunicipalityPicker` com `allowUf`) e `docs/specs/fase-0-permissoes.md` (catálogo, perfis de acesso semeados). Esta spec é autossuficiente — não há histórico de conversa a recuperar.

## Objetivo

O **perfil de compra** do contato com papel comprador: o padrão permanente do que ele procura e de como compra. É o insumo do matching da Fase 2 e da demanda pré-preenchida da oportunidade. Entrega:

1. `buyer_profiles` e as junções `buyer_regions` (município **ou** UF), `buyer_crops` e `buyer_payment_methods`, gravados **no save do contato**, num `change_id` só, com substituição completa.
2. Os **dados financeiros do comprador** (patrimônio estimado e capacidade de investimento) sob a permissão nova `contatos.ver_dados_financeiros`: omitidos na leitura, preservados na escrita e **mascarados no histórico** para quem não a tem — por um mecanismo genérico de metadado de campo (`requiresPermission`).
3. A seção **"Perfil de compra"** no formulário e na ficha do contato, só com o papel comprador.
4. Filtros novos na lista de contatos: perfil de compra, grau de qualificação, urgência, cultura e **região com cobertura** (a UF cobre os seus municípios, nos dois sentidos).
5. A semente de **Perfis de compra** e **Formas de pagamento**.

## Vocabulário

`CONTEXT.md`: **Comprador**, **Perfil de compra**, **Grau de qualificação**, **Classificação do cliente**, **Ticket médio / ticket máximo**, **Capacidade de investimento**, **Patrimônio estimado**, **Região de interesse**, **Culturas da fazenda** (as mesmas entradas das culturas de interesse), **Histórico de alterações**, **Cadastro auxiliar**, **Entrada inativa**.

"Perfil de compra" nomeia a seção inteira **e** o campo investidor/produtor/especulador — na tela são uma coisa só. Nunca "perfil" sozinho em código, rota, componente ou rótulo: é `buyerProfile` / `buyer_profiles` / "Perfil de compra", porque "perfil de acesso" existe. Grau de qualificação e classificação do cliente são conceitos distintos e convivem no comprador.

Rótulos na tela:

| Campo | Rótulo |
|---|---|
| `purchase_profile_id` | Perfil de compra |
| `avg_ticket` / `max_ticket` | Ticket médio / Ticket máximo |
| `min_area_ha` / `max_area_ha` | Área mínima / Área máxima |
| `estimated_net_worth` | Patrimônio estimado |
| `investment_capacity` | Capacidade de investimento |
| `urgency` | Urgência da compra — Alta, Média, Baixa (`LEVEL_LABELS`) |
| `qualification_level` | Grau de qualificação — Frio, Morno, Quente, Qualificado |
| `buyer_regions` | Regiões de interesse — "Rio Verde — GO" ou "Goiás (UF)" (`regionLabel`) |
| `buyer_crops` | Culturas de interesse |
| `buyer_payment_methods` | Formas de pagamento |

## Decisões que governam

- `docs/specs/modelo-de-dados.md` — seção 4; junções auditáveis (`id` uuid PK + `UNIQUE` do par); campo polimórfico com `num_nonnulls(...) = 1`; FK para cadastro auxiliar `ON DELETE RESTRICT`; dinheiro `numeric(16,2)`; área `numeric(12,4)` sempre em hectares; sem soft delete
- `fase-1-contatos.md` — perfil pertence ao módulo `contacts`; retirar o papel comprador apaga os dados exclusivos dele no mesmo save, com confirmação no front; base compartilhada, sem escopo de dados; seções registráveis da ficha (`contactSections.register`)
- `fase-0-permissoes.md` — catálogo em código, sincronizado por migration; Admin e Gestor recebem por regra sobre o catálogo, o Corretor por lista fechada; sem a permissão, **403 antes do banco**
- `fase-1-fundacao.md` — histórico montado sob o recurso com filhos declarados; regras de exibição puras em `assemble`; registro de metadados com teste de cobertura; contrato de listagem
- `fase-1-configuracoes.md` — `purchase-profiles` e `payment-methods` já existem no motor de cadastros auxiliares; `crops` é o mesmo cadastro das culturas da fazenda; `TENANT_SEED`
- `fase-1-municipios.md` / `packages/shared/src/region.ts` — forma `{ ibgeCode } | { uf }`, `regionKey`, `regionLabel`, `municipalityReference`; `MunicipalityPicker` com `allowUf` e `multiple`
- `fase-1-fazendas.md` — referência que **muda** aponta para entrada ativa e município ativo; a já gravada continua; `AreaInput`, `MoneyInput`, `LevelSelect`; filtros de lista separados por vírgula, casando com **qualquer** valor

## Modelo de dados

Tudo com `tenant_id`, timestamps, RLS e `FORCE ROW LEVEL SECURITY`, pelas convenções. As quatro tabelas são **filhos declarados** do contato no histórico e vão junto na exclusão do contato (`CASCADE`).

### `buyer_profiles`

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | uuid PK | o wrapper de auditoria exige `id` |
| `contact_id` | uuid NOT NULL UNIQUE → `contacts` `CASCADE` | 1:1 opcional |
| `purchase_profile_id` | uuid nulo → `purchase_profiles` `RESTRICT` | um só por comprador |
| `avg_ticket`, `max_ticket` | numeric(16,2) nulo | > 0; `CHECK (avg_ticket <= max_ticket)` |
| `min_area_ha`, `max_area_ha` | numeric(12,4) nulo | > 0, em hectares; `CHECK (min_area_ha <= max_area_ha)` |
| `estimated_net_worth` | numeric(16,2) nulo | > 0; **dado financeiro** |
| `investment_capacity` | numeric(16,2) nulo | > 0; **dado financeiro** |
| `urgency` | text nulo, `CHECK ('low','medium','high')` | |
| `qualification_level` | text nulo, `CHECK ('cold','warm','hot','qualified')` | |

Os `CHECK` de comparação passam quando um dos lados é nulo (semântica do SQL). Patrimônio e capacidade não são comparados entre si nem com os tickets. **A linha só existe com ao menos uma coluna preenchida** — perfil todo vazio é ausência de linha (ver Regras).

### `buyer_regions`

`id` uuid PK, `contact_id` → `contacts` `CASCADE`, `municipality_ibge_code` text nulo → `municipalities` `RESTRICT`, `uf` char(2) nulo (`CHECK` na lista das 27 UFs), **`CHECK (num_nonnulls(municipality_ibge_code, uf) = 1)`** — nunca os dois, nunca nenhum. Índices únicos parciais `(contact_id, municipality_ibge_code) WHERE municipality_ibge_code IS NOT NULL` e `(contact_id, uf) WHERE uf IS NOT NULL`. Índices de apoio ao filtro: `(tenant_id, municipality_ibge_code)` e `(tenant_id, uf)`.

### `buyer_crops` e `buyer_payment_methods`

`id` uuid PK, `contact_id` → `contacts` `CASCADE`, e `crop_id` → `crops` `RESTRICT` / `payment_method_id` → `payment_methods` `RESTRICT`. `UNIQUE (contact_id, crop_id)` / `UNIQUE (contact_id, payment_method_id)`.

As junções pendem do **contato**, não de `buyer_profiles`: um comprador pode ter só regiões, sem nenhuma coluna de `buyer_profiles` preenchida.

### Permissão nova

`contatos.ver_dados_financeiros` — "Ver e editar o patrimônio estimado e a capacidade de investimento dos compradores". Entra no catálogo de `packages/shared` e na sincronização por migration, escopo de empresa.

- **Empresas novas:** Admin e Gestor a recebem pela regra sobre o catálogo (`seeded-access-profiles.ts`), sem mudança de código ali. O Corretor **não** — a lista fechada dele não muda.
- **Empresas existentes:** a migration concede a permissão aos perfis de acesso **semeados** (`is_seeded`) chamados Admin e Gestor, com `ON CONFLICT DO NOTHING`. Perfil semeado renomeado ou apagado pela empresa não recebe — é a empresa quem administra os perfis dela.

### Semente

`TENANT_SEED` ganha dois cadastros, nas empresas novas (`tenant:provision`) e por migration nas existentes:

- **Perfis de compra:** Especulador, Investidor, Produtor
- **Formas de pagamento:** À vista, Financiamento, Parcelado, Permuta

A migration das existentes é idempotente: `INSERT … ON CONFLICT DO NOTHING` sobre o índice único do nome (comparação `normalize_text`, sem caixa nem acento), então não duplica entrada que um admin já criou à mão nem a semente aplicada antes.

## Regras de negócio

### Onde e como se grava

- O perfil é **parte do contato**: vem aninhado em `buyerProfile` no `POST` e no `PATCH /contacts`, e é gravado na mesma transação e no mesmo `change_id` que o contato e os papéis. Não há rota própria de perfil.
- **Substituição completa.** `buyerProfile` presente substitui o perfil inteiro — colunas e as três junções. Campo ausente dentro dele é nulo; lista ausente é vazia. Não há merge parcial. A exceção são os dados financeiros para quem não tem a permissão (abaixo).
- `buyerProfile` **ausente** do `PATCH` não toca o perfil. `buyerProfile: null` apaga o perfil e as junções.
- **Perfil vazio não tem linha.** Depois de aplicada a substituição (e preservados os dados financeiros, quando for o caso), se nenhuma coluna de `buyer_profiles` ficou preenchida, a linha é apagada ou nem nasce; as junções seguem as suas listas.
- O serviço grava junções pela diferença contra o estado atual (insere o que entrou, apaga o que saiu), para que o histórico mostre só o que mudou ("Cultura de interesse adicionada: Soja"), nunca apagar-e-recriar tudo.
- **Só com o papel comprador.** `buyerProfile` não nulo em contato que, depois do save, não tem o papel comprador é **400** ("O perfil de compra só existe para compradores.").
- **Retirar o papel comprador apaga o perfil** — colunas, regiões, culturas e formas de pagamento —, junto com a classificação, no mesmo save e no mesmo `change_id`. Vale para qualquer usuário com `contatos.editar`, inclusive sem `contatos.ver_dados_financeiros`: é exclusão, e o histórico guarda os valores anteriores. A regra entra no mesmo ponto do serviço que hoje limpa `classification_id`.

### Validação

Zod em `packages/shared` (`buyerProfileSchema`), o mesmo da API e do formulário, **e** os `CHECK` do banco:

- Valores e áreas positivos; ticket médio ≤ ticket máximo; área mínima ≤ área máxima. Violação é **400** com a mensagem no campo ("O ticket médio não pode passar do ticket máximo.", "A área mínima não pode passar da área máxima.").
- Dinheiro e área trafegam como string decimal, como em fazendas; área sempre em hectares na API.
- Regiões: cada item é `{ ibgeCode }` ou `{ uf }` (`regionOptionSchema` de entrada); item repetido no payload é deduplicado por `regionKey`. **Região redundante** (Goiás e Rio Verde — GO no mesmo perfil) é aceita como veio: com a regra de cobertura, não muda filtro nem matching.
- Referência que **entra** tem de apontar para entrada ativa (perfil de compra, cultura, forma de pagamento) e município ativo — **400**. A que já estava gravada e ficou inativa continua e é exibida pela hidratação por id; reenviá-la no save não a recusa.

### Dados financeiros do comprador

`estimated_net_worth` e `investment_capacity`, sob `contatos.ver_dados_financeiros`:

- **Leitura:** sem a permissão, as duas chaves **não existem** na resposta (nem `null`) — `GET /:id`, resposta do `POST`/`PATCH`, e qualquer outra rota que devolva o perfil.
- **Escrita:** sem a permissão, o payload que traz qualquer uma das duas chaves dentro de `buyerProfile` — com valor **ou `null` explícito** — é **403**, antes de gravar. Sem as chaves, os valores gravados são **preservados** na substituição completa, e contam para "perfil vazio não tem linha".
- **Com a permissão:** substituição completa normal — chave ausente é nulo.
- **Histórico:** ver Auditoria.

### Filtros da lista de contatos

Novos parâmetros, cada um uma lista separada por vírgula que casa com **qualquer** valor escolhido; combinados entre si e com os filtros existentes por **E**:

- `purchaseProfileId`, `qualificationLevel`, `urgency` — colunas de `buyer_profiles`.
- `cropId` — existe linha em `buyer_crops` com alguma das culturas.
- `region` — `<ibge|UF,…>`, com **cobertura nos dois sentidos**, a mesma regra do matching da Fase 2 ("interessar-se pela UF é interessar-se por todos os municípios dela"):
  - escolher a **UF GO** traz quem marcou a UF GO **ou** qualquer município de GO;
  - escolher o **município Rio Verde** traz quem marcou Rio Verde **ou** a UF GO;
  - várias regiões escolhidas: qualquer uma delas.
- A regra de cobertura é uma função de consulta só, reaproveitável pelo matching, não uma condição escrita à mão em cada filtro.
- Sem filtro de faixa de ticket nem de área: "que comprador serve para esta fazenda" é o matching da Fase 2.
- Os filtros não usam dados financeiros, então valem igual para quem tem e quem não tem a permissão.

### Auditoria

- Toda escrita passa pelo wrapper. `buyer_profiles`, `buyer_regions`, `buyer_crops` e `buyer_payment_methods` são **filhos declarados** do contato na rota de histórico, ao lado de `contact_roles`, e entram no registro de metadados de campo na ordem do formulário: `purchase_profile_id`, `crop_id`, `payment_method_id` como referência a cadastro auxiliar; `municipality_ibge_code` com `municipalityReference`; `uf` com o rótulo "Goiás (UF)"; níveis com os rótulos; dinheiro e área formatados pelo contexto de exibição (área na unidade de exibição da empresa).
- Títulos dos filhos: "Perfil de compra adicionado/removido", "Região de interesse adicionada: Rio Verde — GO", "Cultura de interesse adicionada: Soja", "Forma de pagamento adicionada: À vista".
- **Campo que exige permissão própria.** O metadado de campo ganha `requiresPermission` (código do catálogo). `estimated_net_worth` e `investment_capacity` o declaram com `contatos.ver_dados_financeiros`. Na montagem do histórico (`assemble`, pura, com o `reader` que já recebe), para quem **não** tem a permissão, a alteração desse campo **continua aparecendo**, com o rótulo do campo e o texto "Requer permissão para ver esta alteração", **sem** os valores antes e depois. O save que só mexeu nesses campos continua sendo uma entrada do histórico e continua contando no título. Quem tem a permissão vê os valores normalmente. É a forma de deixar claro que houve mudança, sem parecer falha de registro.
- O mecanismo é genérico: qualquer campo de qualquer entidade pode declarar `requiresPermission` depois, sem mudança na rota.

### Acesso

- Ver o perfil: `contatos.ver`. Gravar: `contatos.criar` / `contatos.editar`, como o resto do contato (o rótulo de `contatos.editar` já diz "inclusive perfil de compra"). Dados financeiros: também `contatos.ver_dados_financeiros`.
- Base compartilhada, sem escopo de dados, como em contatos. Contato de outra empresa é **404** (RLS).

### Em uso

Excluir entrada de **Perfis de compra**, **Culturas** ou **Formas de pagamento** referenciada por um perfil é **409** pelo motor de cadastros auxiliares (FK `RESTRICT`, rótulo da entidade pelos metadados: "Esta entrada está em uso em Perfis de compra de compradores…"). Desativar continua permitido.

## Contratos de API

Sob `/e/:tenant/contacts`, as rotas de `fase-1-contatos.md`, com:

```
GET    /                → filtros novos:
         &purchaseProfileId=<id,…>&qualificationLevel=cold,warm,hot,qualified
         &urgency=low,medium,high&cropId=<id,…>&region=<ibge|UF,…>
GET    /:id             → 200 contato com roles e buyerProfile (null sem perfil)
GET    /:id/history     → filhos: contact_roles, buyer_profiles, buyer_regions,
                          buyer_crops, buyer_payment_methods; campos com
                          requiresPermission mascarados (ver Auditoria)
POST   /                → buyerProfile opcional no corpo
PATCH  /:id             → buyerProfile opcional; presente substitui; null apaga
```

Forma de `buyerProfile` (entrada e saída):

```
{
  purchaseProfileId: uuid | null,
  avgTicket, maxTicket: decimal | null,
  minAreaHa, maxAreaHa: decimal | null,          // hectares
  estimatedNetWorth, investmentCapacity: decimal | null,   // só com contatos.ver_dados_financeiros
  urgency: 'low'|'medium'|'high' | null,
  qualificationLevel: 'cold'|'warm'|'hot'|'qualified' | null,
  regions: ({ ibgeCode } | { uf })[],
  cropIds: uuid[],
  paymentMethodIds: uuid[]
}
```

Na saída, contato com o papel comprador e sem nada preenchido devolve `buyerProfile: null`; com só junções, devolve o objeto com as colunas nulas.

- `region` fora do formato (nem 7 dígitos nem UF válida) é **400**, como em fazendas.
- Erros novos: **400** perfil sem papel comprador, comparação de ticket ou área, referência inativa, região com os dois ou nenhum; **403** chave financeira no payload sem a permissão. A recusa do `CHECK` do banco (caso o Zod deixe passar) vira 400 com a mesma mensagem, pela tradução de erro de banco existente.
- Amostras novas em `apps/api/test/response-sweep.integration.test.ts`: contato comprador com perfil completo, lido por Gestor (com as chaves financeiras) e por Corretor (sem elas).

## Telas e componentes

**`apps/web`** (`modules/contacts`):

- **Formulário:** seção **"Perfil de compra"** no `EntityForm`, visível enquanto "Comprador" está marcado, depois da seção Dados: perfil de compra (`VocabularyField`), grau de qualificação (`Select` com os quatro rótulos), urgência (`LevelSelect`), ticket médio e máximo (`MoneyInput`), área mínima e máxima (`AreaInput`, unidade de exibição e alqueire padrão da empresa), regiões de interesse (`MunicipalityPicker` com `allowUf` e `multiple`), culturas de interesse e formas de pagamento (`VocabularyField` múltiplo), e — **só com `contatos.ver_dados_financeiros`** — patrimônio estimado e capacidade de investimento (`MoneyInput`). Sem a permissão, os dois campos **não aparecem** (nem rótulo, nem aviso) e o payload do save **não leva** as duas chaves — é o que evita o 403 no uso normal.
- **Desmarcar "Comprador"** com perfil ou classificação preenchidos abre o `ConfirmDialog` dizendo o que será apagado ("A classificação e o perfil de compra deste contato serão apagados."); ao confirmar, a seção some e o save leva `buyerProfile: null`. Remarcar antes de salvar traz a seção vazia.
- **Ficha:** seção registrada **"Perfil de compra"** (`contactSections.register`, condicionada ao papel `buyer`), depois de Dados, com `SpecList` dos campos, regiões por `regionLabel`, áreas na unidade de exibição, culturas e formas de pagamento pelos nomes. Sem a permissão, patrimônio e capacidade **não aparecem**. Sem perfil, a seção mostra o estado vazio com o atalho "Preencher perfil de compra" para o formulário (com `contatos.editar`).
- **Lista:** filtros novos no painel de filtros da `ListPage` — perfil de compra, culturas (`VocabularyField` em modo filtro, múltiplo), grau de qualificação e urgência (múltiplos) e região (`MunicipalityPicker` com `allowUf` e `multiple`) —, escritos na URL pelo `useListQuery` com o mesmo `contactListQuerySchema` da API. **Nenhuma coluna nova** nem mudança no cartão do mobile.
- Os rótulos saem do registro de metadados de campo e de `QUALIFICATION_LEVEL_LABELS` (`packages/shared`); `URGENCY` reaproveita `LEVELS` / `LEVEL_LABELS`.

**`packages/ui`:** nenhum componente novo — `MoneyInput`, `AreaInput`, `LevelSelect`, `MunicipalityPicker` e `VocabularyPicker` cobrem a seção. Se o `MunicipalityPicker` com `allowUf` ainda não tiver story no modo `multiple`, ela entra aqui. Nenhuma aparência fora das receitas de `styles.ts`.

## Critérios de aceite

**Gravação**

1. **Integração:** `POST` de comprador com `buyerProfile` completo (colunas, uma UF e um município, culturas, formas de pagamento) grava tudo num `change_id`; `GET /:id` devolve o mesmo perfil.
2. **Integração:** `PATCH` com `buyerProfile` substitui o perfil inteiro — campo omitido vira nulo, região/cultura/forma de pagamento fora da lista sai —; `PATCH` sem `buyerProfile` não o toca; `buyerProfile: null` apaga perfil e junções.
3. **Integração:** perfil com todas as colunas vazias não gera linha em `buyer_profiles` (e apaga a existente), mas mantém as junções enviadas; a resposta segue a forma do contrato.
4. **Integração:** `buyerProfile` em contato sem o papel comprador é 400.
5. **Integração:** retirar o papel comprador apaga perfil, junções e classificação no mesmo save e no mesmo `change_id`; o histórico guarda os valores anteriores.

**Banco e validação**

6. **Integração:** ticket médio > ticket máximo e área mínima > área máxima são 400 pela API; o mesmo insert direto no banco é recusado pelo `CHECK`; com um dos lados nulo, passa.
7. **Integração:** perfil com a UF GO e o município Rio Verde — GO grava as duas linhas (os dois índices parciais); UF repetida ou município repetido no mesmo contato é recusado pelo índice; linha com município **e** UF, ou com nenhum dos dois, é recusada pelo `CHECK` (insert direto) e é 400 pela API.
8. **Integração:** perfil de compra, cultura ou forma de pagamento **inativos** entrando no perfil são 400; o que já estava gravado e foi desativado depois continua e passa no save sem alteração; município inativo, idem.
9. **Integração:** excluir entrada de perfil de compra, cultura ou forma de pagamento em uso por um perfil é 409 com o rótulo; excluir o contato leva perfil e junções (`CASCADE`).

**Dados financeiros**

10. **Integração:** Gestor lê patrimônio e capacidade; Corretor (sem `contatos.ver_dados_financeiros`) recebe o contato **sem as duas chaves** em `GET /:id` e na resposta do `PATCH`.
11. **Integração:** Corretor que envia `estimatedNetWorth` ou `investmentCapacity` com valor **ou com `null` explícito** recebe 403 e nada é gravado; Corretor que salva o perfil sem as duas chaves **preserva** os valores gravados, e o perfil não é apagado por estar "vazio" quando só elas estão preenchidas.
12. **Integração:** Corretor que retira o papel comprador apaga o perfil inteiro, inclusive os dados financeiros.
13. **Unitário (`assemble`):** com um `reader` sem a permissão, a alteração de campo com `requiresPermission` sai com o rótulo e "Requer permissão para ver esta alteração", sem valores; o save que só mexeu nesse campo continua sendo entrada e contando no título; com a permissão, os valores aparecem. Vale para campo do registro e de filho.
14. **Integração:** `GET /:id/history` como Corretor mostra a entrada da mudança de patrimônio mascarada, inclusive o valor anterior quando o perfil é apagado; como Gestor, com os valores.

**Filtros**

15. **Integração:** filtros por perfil de compra, grau de qualificação, urgência e cultura (qualquer um dos escolhidos), combinados entre si e com papel; `total` correto.
16. **Integração:** região com cobertura: filtrar pela UF GO traz quem marcou GO e quem marcou um município de GO; filtrar por Rio Verde traz quem marcou Rio Verde e quem marcou GO, e não quem marcou outro município de GO nem outra UF; várias regiões casam com qualquer uma; região malformada é 400.

**Permissão, semente e migrations**

17. **Integração:** `tenant:provision` cria os perfis de compra e as formas de pagamento da semente (auditados com autor nulo) e dá `contatos.ver_dados_financeiros` a Admin e Gestor, não ao Corretor.
18. **Integração:** a migration da permissão e da semente, **aplicada duas vezes** sobre uma empresa existente (inclusive com uma forma de pagamento criada à mão com o mesmo nome sem acento), não duplica a permissão nos perfis nem as entradas dos cadastros; perfil semeado renomeado não recebe a permissão.
19. **Unitário:** a migration da semente contém exatamente os valores de `TENANT_SEED`.
20. **Integração:** contato de outra empresa é 404 em toda rota, e os filtros não enxergam perfis de outra empresa (RLS nas quatro tabelas).

**Telas**

21. **Front (API falsa):** a seção "Perfil de compra" do formulário aparece ao marcar "Comprador" e some ao desmarcar, com `ConfirmDialog` quando há algo preenchido; o save leva `buyerProfile: null` depois da confirmação.
22. **Front (API falsa):** com `contatos.ver_dados_financeiros`, o formulário mostra patrimônio e capacidade e o payload os leva; **sem** a permissão, os campos não aparecem e o payload do save **não contém** as duas chaves.
23. **Front (API falsa):** a ficha mostra a seção "Perfil de compra" só para comprador, com regiões no formato "Rio Verde — GO" / "Goiás (UF)" e áreas na unidade de exibição; sem a permissão, sem patrimônio e capacidade; sem perfil, o estado vazio com o atalho.
24. **Front (API falsa):** os filtros novos da lista são escritos na URL e enviados à API (`region=5218805,GO`).
25. Teste de cobertura de metadados verde com as quatro tabelas; teste de schema de FK `RESTRICT` dos cadastros auxiliares verde com as FKs novas; teste de RLS verde com as quatro tabelas; `tsc --noEmit` limpo; migrations aplicam de banco zerado; `pnpm lint` verde.
26. No navegador (`pnpm dev`): cadastrar um comprador com perfil (Goiás e Rio Verde, soja, à vista, patrimônio), filtrar a lista por Rio Verde e achá-lo, entrar como Corretor e ver a ficha sem patrimônio e o histórico com a alteração mascarada, retirar o papel comprador e ver o perfil sumir.

## Fora de escopo

- **Matching** e a **demanda** pré-preenchida da oportunidade — Fase 2 (a regra de cobertura de região fica pronta para ser reaproveitada)
- Histórico de atendimentos (atividades, Fase 3) e histórico de negociações (oportunidades, Fase 2)
- Perfil de compra no **cadastro rápido** do `ContactField`
- Filtro por faixa de ticket, de área ou por dados financeiros; colunas novas na lista; exportação — Fase 4
- Perfil de compra múltiplo por comprador (junção aditiva se aparecer o caso)
- Grau de qualificação configurável pela empresa (vira cadastro auxiliar se pedirem)
- Tela de perfis de acesso para conceder `contatos.ver_dados_financeiros` a outros perfis — Fase 3
- Eliminação de dados pessoais a pedido do titular (LGPD), que anonimiza o `audit_log` — Fase 5

## Depende de

`fase-1-contatos` (contato, papéis, dados exclusivos do papel, seções registráveis, contrato da API), `fase-1-municipios` (`municipalities`, região município-ou-UF, `MunicipalityPicker`), `fase-1-configuracoes` (`purchase_profiles`, `payment_methods`, `crops`, `VocabularyField`, `TENANT_SEED`) e `fase-1-fundacao` (metadados de campo, histórico, padrão de listagem).
