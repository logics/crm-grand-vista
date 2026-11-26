# Spec — Cadeia de indicação

> **Leitura obrigatória:** `CLAUDE.md`, `CONTEXT.md` (seção "Indicação e comissão" — **Cadeia de indicação**, **Indicador**, **Indicações feitas** —, seção "Corretores" — **Corretor interno**, **Corretor externo** —, e **Escopo de dados**, **Histórico de alterações**), `docs/adr/0005-cadeia-de-indicacao-por-registro.md`, `docs/specs/modelo-de-dados.md` (convenções e `referral_links`), `docs/specs/fase-1-fundacao.md` (metadados de campo, histórico, padrão de listagem), `docs/specs/fase-1-contatos.md` (papéis, `ensureContactRole`, uso declarado, seções registráveis, `ContactField`, contrato da API), `docs/specs/fase-1-fazendas.md` (escopo `own`, filtros da lista, seções registráveis, contrato da API) e `docs/specs/fase-0-permissoes.md` (escopo de dados e 404). Esta spec é autossuficiente — não há histórico de conversa a recuperar.

## Objetivo

A **cadeia de indicação** de contatos e de fazendas: quem trouxe o registro, e de quem esse soube, em N níveis. Entrega, nos dois lados de uma vez:

1. `referral_links`, gravada **no save do contato e no save da fazenda**, aninhada no `POST`/`PATCH`, com substituição completa e no mesmo `change_id` do registro.
2. O módulo `referrals`, dono das regras da cadeia, consumido por contatos e fazendas.
3. O `ReferralChainEditor` nos dois formulários e a cadeia somente leitura nas duas fichas.
4. O filtro **"Indicado por"** nas listas de contatos e de fazendas, e a seção **"Indicações feitas"** na ficha do contato corretor externo, montada sobre essas mesmas listas e, portanto, sobre o escopo de dados delas.
5. Contato que entra numa cadeia ganha o papel **Corretor externo**, protegido pelo uso declarado, com a mensagem de "em uso" que não revela registros fora do escopo de quem pede.

## Vocabulário

`CONTEXT.md`: **Cadeia de indicação**, **Indicador**, **Indicações feitas**, **Corretor interno**, **Corretor externo**, **Escopo de dados**, **Histórico de alterações**.

Na tela: seção **"Cadeia de indicação"** no formulário e na ficha; cada item é um **indicador**, com o número da posição e a marca "Interno"/"Externo" (`REFERRER_KIND_LABELS`, já existente); filtro **"Indicado por"**; seção **"Indicações feitas"**. Em código, `referral`/`referrer`/`referralChain`. Nunca "indicação" para a origem do lead: aquilo é o vocabulário **Origem do lead**, sem relação com a cadeia.

## Decisões que governam

- `docs/adr/0005-cadeia-de-indicacao-por-registro.md` — cada registro guarda a própria lista; nenhuma montagem recursiva a partir da cadeia do indicador
- `docs/specs/modelo-de-dados.md` — `referral_links`; campo polimórfico com `num_nonnulls(...) = 1`; junção auditável (`id` uuid PK); sem soft delete
- `fase-1-contatos.md` — `ensureContactRole` na transação do save; `declareRoleUsage` já prevê `external_broker → referral_links.referrer_contact_id`; seções registráveis (`contactSections.register`); `ContactField` com cadastro rápido (exige `contatos.criar`); base compartilhada, sem escopo de dados
- `fase-1-fazendas.md` — escopo `own` pelo corretor responsável, registro fora do escopo é 404; filtros da lista em lista separada por vírgula, casando com **qualquer** valor; `farmSections.register`; contato de outra empresa é 400 no campo (a FK não passa pelo RLS); padrão de `EXISTS` do `listFarmsOfOwner`
- `fase-1-perfil-de-compra.md` — precedente de dado aninhado no save: ausente não toca, presente substitui; junções gravadas pela diferença, para o histórico mostrar só o que mudou
- `fase-0-permissoes.md` — sem entrada nova no catálogo: a cadeia é parte do registro pai

## O que já existe (PR #70, issue #54)

Esta spec **consome e estende** as peças abaixo, nunca as reescreve:

- `packages/shared/src/referral-chain.ts`: `REFERRER_KINDS`, `REFERRER_KIND_LABELS`, os tipos `Referrer`/`ReferralSubject`/`ReferralLink`, `referrerKey` (identidade `user:<id>`/`contact:<id>`), `assembleReferralChain`, `validateReferralChain` (problemas `duplicate` e `cycle`), `describeReferralChainIssue` (as mensagens da tela **e** da API), `isEligibleReferrer`, `appendReferralLink`, `removeReferralLink`, `reorderReferralChain`, com testes em `packages/shared/test/referral-chain.test.ts`.
- `packages/ui/src/components/referral-chain-editor.tsx`: controlado (`value`/`onChange`), somente leitura sem `onChange` ou com `readOnly`, reordenação por arrastar **e** por teclado (`useReorder`, anunciada), nota por elo, problema exibido no elo, e a escolha do próximo indicador pelo `PartyPicker` (alternância Externo/Interno sobre `ContactPicker`/`UserPicker`, buscas recebidas por `searchUsers`/`searchContacts`). Stories e testes existentes.

## Modelo de dados

### `referral_links`

Com `tenant_id`, timestamps, RLS e `FORCE ROW LEVEL SECURITY`, pelas convenções.

| Coluna                | Tipo                              | Regra                                                  |
| --------------------- | --------------------------------- | ------------------------------------------------------ |
| `id`                  | uuid PK                           | o wrapper de auditoria exige `id`                      |
| `subject_contact_id`  | uuid nulo → `contacts` `CASCADE`  | sujeito contato                                        |
| `subject_farm_id`     | uuid nulo → `farms` `CASCADE`     | sujeito fazenda                                        |
| `referrer_user_id`    | uuid nulo → `users` `RESTRICT`    | indicador corretor interno                             |
| `referrer_contact_id` | uuid nulo → `contacts` `RESTRICT` | indicador contato                                      |
| `position`            | int NOT NULL                      | `CHECK (position BETWEEN 1 AND 10)`; 1 = trouxe direto |
| `notes`               | text nulo                         | `CHECK (char_length(notes) <= 500)`                    |

`CHECK`s:

- `num_nonnulls(subject_contact_id, subject_farm_id) = 1`
- `num_nonnulls(referrer_user_id, referrer_contact_id) = 1`
- `subject_contact_id IS NULL OR referrer_contact_id IS NULL OR subject_contact_id <> referrer_contact_id`: o contato não aparece na própria cadeia. `IS DISTINCT FROM` trata dois nulos como iguais e barraria a fazenda indicada por usuário, que tem os dois lados nulos.

Restrições e índices:

- **Posição única por sujeito, checada no fim da transação:** `UNIQUE (tenant_id, subject_contact_id, position) DEFERRABLE INITIALLY DEFERRED` e o mesmo com `subject_farm_id`. Têm de ser **restrições**, não índices parciais: índice não é adiável. Funcionam com a coluna nula porque o Postgres trata nulos como distintos, então as linhas da fazenda não colidem na restrição do contato e vice-versa. Escritas à mão no SQL da migration, se o Drizzle não gerar `DEFERRABLE`.
- **Indicador único por sujeito:** `UNIQUE (subject_contact_id, referrer_contact_id)`, `UNIQUE (subject_contact_id, referrer_user_id)`, `UNIQUE (subject_farm_id, referrer_contact_id)`, `UNIQUE (subject_farm_id, referrer_user_id)`. Não precisam ser adiáveis: o save cruza pela identidade do indicador e não troca indicadores de linha.
- Índices do filtro "Indicado por": `(tenant_id, referrer_contact_id)` e `(tenant_id, referrer_user_id)`.

A contiguidade das posições (1..N sem buracos) é do serviço, não do banco.

Nenhuma permissão nova, nenhuma semente.

## Regras de negócio

### Módulo `referrals`

`apps/api/src/modules/referrals` é dono de tudo o que é regra da cadeia no servidor; contatos e fazendas só chamam. Testes em `apps/api/test/modules/referrals`. A regra pura continua em `packages/shared/src/referral-chain.ts`, a mesma do editor. Exporta:

- `referralChainInputSchema` (em `packages/shared`, ao lado das funções puras, o mesmo da API e do formulário).
- `replaceReferralChain(tx, actor, subject, links)` — valida com `validateReferralChain` do shared, checa os indicadores que entram, grava pela diferença e garante o papel.
- `readReferralChain(tx, subject)` — leitura hidratada.
- `referredBy({ contactIds, userIds }, subjectColumn)` — a condição `EXISTS` do filtro, a **única** forma de filtrar por indicador, usada pelas duas listas.
- A declaração de uso do papel `external_broker` (`declareRoleUsage`), no `routes.ts` do módulo, como fazendas faz com `owner`.

O módulo **não** tem rota própria.

### Onde e como se grava

- A cadeia vem aninhada em `referralChain` no `POST` e no `PATCH` de `/contacts` e de `/farms`, e é gravada na mesma transação e no mesmo `change_id` do registro.
- `referralChain` **ausente** do `PATCH` não toca a cadeia. `referralChain: []` apaga a cadeia. Presente, **substitui a cadeia inteira**: a ordem da lista é a posição (o primeiro é a posição 1), e o cliente nunca envia `position`.
- **Gravação pela diferença, cruzando pela identidade do indicador** (`user:<id>` ou `contact:<id>`): indicador que continua mantém a linha e o `id`, e só `position`/`notes` mudam; indicador que saiu é apagado; indicador que entrou é inserido. Assim, inverter a ordem de dois indicadores gera "Posição: 1 → 2" e "Posição: 2 → 1", nunca um removido e outro adicionado.
- A troca de posições passa pelo meio da transação com duas linhas na mesma posição; a restrição adiável só checa no `COMMIT`. **Não** usar valor temporário de posição: o wrapper de auditoria registraria o valor intermediário.
- **Papel garantido:** cada contato da cadeia, em qualquer posição, recebe `external_broker` por `ensureContactRole`, na mesma transação. Sair de todas as cadeias **não** retira o papel.

### Invariantes

Validadas pelo Zod da borda e por `validateReferralChain` (shared), e reforçadas pelo banco onde dá. Problema de cadeia é 400 com a mensagem de `describeReferralChainIssue` e a posição do elo, a mesma que o editor mostra:

- No máximo **10** indicadores: constante nova `MAX_REFERRAL_CHAIN_LENGTH = 10` no shared, usada pelo Zod (400, "A cadeia de indicação aceita até 10 indicadores.") e pelo editor (ver Telas). Não vira problema de `validateReferralChain`: é limite de tamanho, não de elo.
- O mesmo indicador não aparece duas vezes: problema `duplicate`, já existente.
- O contato não aparece na própria cadeia: problema `cycle`, já existente. No `POST` é impossível, porque o contato ainda não tem id; vale no `PATCH`.
- Corretor interno e contato podem ocupar **qualquer** posição ("Carlos, interno, soube pelo Antônio, externo": Carlos na 1, Antônio na 2).
- `notes` até 500 caracteres, texto livre ("conheceu na Agrishow").
- **Indicador que entra:**
  - contato tem de ser da empresa ativa — 400 no item (a FK não passa pelo RLS, como `owners` em fazendas);
  - usuário tem de ter **vínculo** com a empresa ativa e não pode ser super admin — 400 no item ("Usuário não faz parte da equipe."). `users` está fora do RLS, então a checagem é do serviço.
- **Indicador que já estava gravado** continua mesmo que o usuário tenha perdido o vínculo: reenviá-lo sem alteração no save não é recusado, no mesmo padrão das entradas inativas.

### Leitura

- `GET /contacts/:id` e `GET /farms/:id` devolvem `referralChain` hidratada, em ordem de posição, sempre presente (lista vazia sem cadeia).
- Usuário indicador traz `linked: false` quando perdeu o vínculo com a empresa; a tela o marca como "sem acesso". O nome vem do servidor, então a hidratação não depende do `GET /users` (que só lista a equipe atual). `is_super_admin` nunca aparece.
- Ver a cadeia exige ver o registro: `contatos.ver`, ou `fazendas.ver` dentro do escopo. Fazenda fora do escopo continua 404, com a cadeia junto.

### Filtro "Indicado por"

- Novos parâmetros nas listas de **contatos** e de **fazendas**: `referrerContactId=<id,…>` e `referrerUserId=<id,…>`. Casam com indicador em **qualquer posição**; os dois parâmetros juntos casam com **qualquer** indicador escolhido; combinados com os demais filtros por **E**.
- A condição é sempre `referredBy(...)`: `EXISTS (SELECT 1 FROM referral_links …)`, **nunca** `JOIN`. Assim cada registro aparece uma vez, por mais linhas que a cadeia tenha, e o `total` do `paginatedQuery` conta registros, não linhas.
- O filtro entra como mais uma condição no `paginatedQuery` da listagem que já existe. Escopo, paginação e `count` são os da própria lista, e não existe consulta nova com escopo.

### Indicações feitas

- Seção da ficha do contato com o papel Corretor externo, em dois blocos: **Contatos** (`GET /contacts?referrerContactId=<id>`) e **Fazendas** (`GET /farms?referrerContactId=<id>`), cada um paginado.
- As fazendas vêm do **mesmo endpoint e do mesmo filtro de escopo** da lista de fazendas: um Corretor com escopo `own` vê só as fazendas de que é corretor responsável, e o total do bloco é o total dessas.
- As fazendas aparecem em **todos os status**, inclusive desativadas, como a seção "Fazendas" do proprietário: a seção envia o filtro de status explícito, sem herdar o padrão "todos menos desativadas" da lista.
- Sem a posição: a lista não a devolve, e ela está a um clique, na cadeia do registro.
- Sem `fazendas.ver`, o bloco de fazendas não aparece.

### Uso declarado e a mensagem de "em uso"

- O módulo declara `external_broker → referral_links.referrer_contact_id`, com rótulos "cadeia de indicação" / "cadeias de indicação" e `inUsePhrase` "é indicador em cadeia de indicação". Retirar o papel Corretor externo de quem está em alguma cadeia é **409**. Excluir o contato é barrado pela FK `RESTRICT`, com a mensagem da `inUsePhrase`, sem contagem.
- **A contagem não pode revelar registro fora do escopo.** Hoje a mensagem diz "João é corretor externo de 3 cadeias de indicação". Se uma delas é de fazenda que quem pede não enxerga, o número revela que ela existe. Então:
  - `RoleUsage` ganha `visibleCount?(tx, access, contactId)`, e `countRoleUsage` passa a receber o acesso de quem pede;
  - o **bloqueio continua global**: conta todas as linhas, porque o papel não pode sair enquanto qualquer cadeia o usa;
  - só na hora do bloqueio, com a declaração que tem `visibleCount`, roda a contagem filtrada pelo acesso. Se ela for menor que a total, a mensagem sai **sem número**: "João é corretor externo em cadeias de indicação; troque o corretor externo antes de retirar o papel.";
  - o `visibleCount` da cadeia conta os elos de sujeito contato mais os de sujeito fazenda dentro do escopo, usando o escopo **exportado pelo módulo de fazendas** (`farmScopeOf(access)`, o atual `scopeOf` de `farms/service.ts`, agora exportado e usado também pela lista). Não é uma segunda chamada a `dataScopeClause` com módulo e coluna repetidos.
- **A declaração `owner` de fazendas tem o mesmo vazamento** ("é proprietário de 3 fazendas") e passa a declarar `visibleCount` pelo mesmo `farmScopeOf`. É uma linha na declaração, e o mecanismo genérico nasce aqui.

### Histórico

- `referral_links` é **filho declarado** do sujeito: na rota de histórico do contato e na da fazenda. Não entra no histórico do indicador.
- Metadados de campo, na ordem do editor: `referrer_user_id` (referência a usuário, pelo nome), `referrer_contact_id` (referência a contato, pelo nome), `position` ("Posição"), `notes` ("Nota", o rótulo do editor).
- Títulos: "Indicador adicionado: João (posição 1)", "Indicador removido: Sebastião", "Indicador alterado: João" com a linha "Posição: 1 → 2".
- O papel Corretor externo garantido pelo save aparece no histórico do contato indicador, que é onde o papel mora, como em fazendas com `owner`.

### Acesso

- Gravar: `contatos.criar`/`contatos.editar` no contato; `fazendas.criar`/`fazendas.editar` na fazenda, dentro do escopo. Escolher contato no editor segue o `ContactField` (busca exige `contatos.ver`, cadastro rápido exige `contatos.criar`); escolher usuário segue o `UserField`.
- Nenhuma entrada nova no catálogo.

## Contratos de API

Sob `/e/:tenant/contacts` e `/e/:tenant/farms`, as rotas existentes, com:

```
GET    /                → filtros novos: &referrerContactId=<id,…>&referrerUserId=<id,…>
GET    /:id             → 200 com referralChain (lista, vazia sem cadeia)
GET    /:id/history     → filho novo: referral_links
POST   /                → referralChain opcional no corpo
PATCH  /:id             → referralChain opcional; ausente não toca; presente substitui; [] apaga
```

Entrada:

```
referralChain: {
  referrer: { kind: 'user', id: uuid } | { kind: 'contact', id: uuid },
  notes?: string | null          // até 500
}[]                              // ordem = posição; até 10
```

Saída:

```
referralChain: {
  id: uuid,
  position: number,              // 1..N, contígua
  referrer: { kind: 'user', id, name, linked: boolean }
          | { kind: 'contact', id, name },
  notes: string | null
}[]
```

- Erros novos: **400** mais de 10 indicadores, indicador repetido, contato na própria cadeia, contato de outra empresa, usuário sem vínculo ou super admin, `notes` acima de 500, id malformado no filtro. A recusa do `CHECK`/`UNIQUE` do banco, caso o Zod deixe passar, vira 400 com a mesma mensagem, pela tradução de erro de banco existente.
- **409** ao retirar o papel Corretor externo em uso, com a mensagem de "em uso" acima.
- Amostras novas em `apps/api/test/response-sweep.integration.test.ts`: contato e fazenda com cadeia mista (usuário e contato), lidos por Gestor e por Corretor; nenhuma chave `isSuperAdmin`/`is_super_admin`, inclusive com um super admin vinculado como indicador gravado antes da concessão.

## Telas e componentes

**`packages/ui`**: o `ReferralChainEditor` e o `PartyPicker` existentes, com três extensões, e nenhum componente novo:

- **Limite:** com `MAX_REFERRAL_CHAIN_LENGTH` elos, o `PartyPicker` some e o editor mostra "Limite de 10 indicadores atingido."
- **Indicador sem acesso:** `Referrer` ganha `linked?: boolean` no shared. Com `linked === false`, o elo mostra a marca "Sem acesso" ao lado de "Interno". O nome vem do `value`, sem busca, então nada depende do `UserPicker` achar o usuário.
- **Cadastro rápido:** `PartySearches` ganha `onCreateContact?: (term) => Promise<Referrer | null>`: o `PartyPicker` o repassa ao `ContactPicker` como `onCreate` e inclui por `onPick` (o `add` do editor) o contato devolvido; `null` é cadastro cancelado e o foco volta ao seletor; rejeitar a promessa vale como `null`. Assim o editor oferece "Cadastrar contato" quando o app o fornece.
- Stories novas: limite atingido e indicador sem acesso. Nenhuma aparência fora das receitas de `styles.ts`.

**`apps/web`** (`modules/referrals`):

- **`ReferralChainField`**: o `ReferralChainEditor` ligado à empresa ativa. Fornece `searchUsers` pela equipe (a mesma fonte do `UserField`, `GET /users`), `searchContacts` pela busca do `ContactField` e `onCreateContact` pelo `QuickContactDialog` (só com `contatos.criar`), e aceita o `subject` do formulário. Sem `contatos.ver` não há `searchContacts`, e sem a busca de usuários só entra contato, pelas regras do `PartyPicker`.
- **Formulários:** seção **"Cadeia de indicação"** no `EntityForm` do contato (depois de Dados, para qualquer papel) e no da fazenda (depois de Proprietários), com o `ReferralChainField`. O payload só leva `referralChain` quando a seção foi tocada, como `{ referrer: { kind, id }, notes }` na ordem.
- **Fichas:** seção registrada "Cadeia de indicação" (`contactSections.register` e `farmSections.register`) com o **mesmo** `ReferralChainEditor` em somente leitura. No estado vazio, atalho "Registrar indicação" para o formulário (com permissão de editar).
- **Indicações feitas:** seção registrada na ficha do contato, condicionada ao papel `external_broker`, com os dois blocos sobre `DataTable` + `Pagination`, consultando as listas com `referrerContactId`. Estado vazio por bloco.
- **Listas:** filtro "Indicado por" em dois campos, "Indicado por (contato)" com o `ContactField` múltiplo e "Indicado por (interno)" com o `UserField` múltiplo, no painel de filtros de contatos e no "Mais filtros" de fazendas. Os dois vão para a URL pelo `useListQuery`, com o mesmo schema de query da API. O `PartyPicker` não serve aqui, porque ele esvazia depois de cada escolha.

## Critérios de aceite

**Gravação**

1. **Integração:** `POST` de contato e de fazenda com `referralChain` mista (usuário na 1, contato na 2) grava tudo no `change_id` do registro; `GET /:id` devolve a cadeia na ordem, com nomes.
2. **Integração:** `PATCH` sem `referralChain` não toca a cadeia; com `[]` apaga; com lista nova substitui (o que saiu é apagado, o que entrou é inserido).
3. **Integração:** inverter a ordem de dois indicadores mantém os dois `id`s, e o histórico mostra "Posição: 1 → 2" e "2 → 1", **não** um removido e outro adicionado; nenhuma posição intermediária aparece no `audit_log`.
4. **Integração:** o mesmo swap feito por SQL direto, linha a linha, dentro de uma transação, passa; deixar duas linhas na mesma posição no `COMMIT` é recusado pela restrição adiável.
5. **Integração:** todo contato da cadeia, em qualquer posição, sai do save com o papel Corretor externo (auditado no histórico dele); tirá-lo de todas as cadeias não retira o papel.

**Invariantes e banco**

6. **Unitário (shared):** `referralChainInputSchema` recusa 11 indicadores e nota com 501 caracteres; os testes existentes de `validateReferralChain` continuam verdes.
7. **Integração:** cadeia acima do limite, indicador repetido e contato na própria cadeia são 400, com a mensagem de `describeReferralChainIssue` e a posição; contato de outra empresa e usuário sem vínculo ou super admin entrando são 400 no item; usuário que perdeu o vínculo depois de gravado passa no save sem alteração e volta com `linked: false`.
8. **Integração (schema):** insert direto com dois sujeitos, nenhum sujeito, dois indicadores, nenhum indicador, posição 0 ou 11, contato na própria cadeia ou `notes` com 501 caracteres é recusado pelo banco.
9. **Integração:** excluir o sujeito (contato ou fazenda) leva a cadeia (`CASCADE`); excluir contato que é indicador é barrado com a mensagem da `inUsePhrase`.

**Filtro e escopo**

10. **Integração:** filtrar a lista de fazendas por `referrerContactId` traz as fazendas em que o contato está em **qualquer** posição; `referrerUserId` idem; os dois juntos casam com qualquer um; combinado com outro filtro, por E. O mesmo para a lista de contatos.
11. **Integração (sem duplicar):** uma fazenda com dois indicadores escolhidos no filtro (João na 1, Carlos na 2, filtrando pelos dois) aparece **uma vez**, e o `total` conta uma.
12. **Integração (escopo, critério próprio):** com um Corretor de escopo `own` e o mesmo contato indicador em três fazendas, uma delas do Corretor: `GET /farms?referrerContactId=` devolve **só a dele**, com `total` 1, igual ao número de fazendas que ele enxerga; o Gestor (escopo `all`) vê as três.
13. **Integração:** a fazenda fora do escopo é 404 em `GET /farms/:id`, com cadeia e tudo; RLS: nenhum filtro nem leitura enxerga `referral_links` de outra empresa.

**Mensagem de "em uso"**

14. **Integração (critério próprio):** retirar o papel Corretor externo de um contato que está em cadeias de três fazendas é 409 para qualquer perfil; o Gestor recebe a mensagem com o número; o Corretor que enxerga só uma das fazendas recebe a mensagem **sem número**; o Corretor que enxerga todas recebe o número.
15. **Integração:** o mesmo para o papel Proprietário em fazendas (`owner`), pelo `visibleCount` da declaração de fazendas.
16. **Unitário:** a montagem da mensagem com contagem visível menor que a total omite o número; igual, mantém.

**Telas**

17. **UI (`packages/ui`):** com 10 elos, o `ReferralChainEditor` esconde o seletor e mostra o aviso de limite; o elo com `linked: false` mostra "Sem acesso"; com `onCreateContact`, o `ContactPicker` do `PartyPicker` oferece "Cadastrar contato".
18. **Front (API falsa):** no formulário de contato e no de fazenda, o `ReferralChainField` adiciona (interno e externo), reordena e remove elos, e o payload sai na ordem da tela como `{ referrer: { kind, id }, notes }`, sem `position`; o payload não leva `referralChain` quando a seção não foi tocada; o cadastro rápido de contato entra como elo.
19. **Front (API falsa):** as fichas mostram a cadeia em somente leitura, na ordem, e o estado vazio; "Indicações feitas" só aparece para corretor externo, com os dois blocos consultando as listas com `referrerContactId` e todos os status de fazenda.
20. **Front (API falsa):** os filtros "Indicado por" vão para a URL e para a API (`referrerContactId=…&referrerUserId=…`) nas duas listas.
21. Stories novas do `ReferralChainEditor`; testes existentes de `referral-chain` e do editor verdes; teste de cobertura de metadados verde com `referral_links`; teste de RLS verde com a tabela nova; `tsc --noEmit` limpo; migrations aplicam de banco zerado; `pnpm lint` verde.
22. No navegador (`pnpm dev`): cadastrar o Pedro com a cadeia João → Sebastião (Sebastião pelo cadastro rápido), cadastrar uma fazenda com Carlos (interno) → Antônio, inverter a ordem e ver "Posição" no histórico, filtrar as fazendas por Antônio, abrir a ficha do João e ver "Indicações feitas", entrar como Corretor e confirmar que fazenda alheia não aparece no bloco nem no total.

## Fora de escopo

- Cadeia montada por recursão a partir da cadeia do indicador (ADR 0005)
- Ligação com **Origem do lead** ("Indicação"): nenhuma sugestão nem exigência
- Relação com **comissão**: a cadeia não gera participante nem grupo — Fase 2, montada de forma independente
- "Indicações feitas" para **corretor interno** (não há ficha de usuário); o filtro "Indicado por" cobre o caso
- Posição do indicador na seção "Indicações feitas"
- Retirada automática do papel Corretor externo quando o contato sai de todas as cadeias
- Cadeia de indicação no cadastro rápido do `ContactField`
- Relatórios e ranking de indicadores — Fase 4

## Depende de

`fase-1-contatos` (contato, papéis, `ensureContactRole`, uso declarado, seções registráveis, `ContactField`), `fase-1-fazendas` (fazenda, escopo `own`, filtros da lista, seções registráveis) e `fase-1-fundacao` (metadados de campo, histórico, padrão de listagem).
