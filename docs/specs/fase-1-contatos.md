# Spec — Contatos

> **Leitura obrigatória:** `CLAUDE.md`, `CONTEXT.md` (seções "Contato" e "Corretores", e **Escopo de dados**, **Classificação do cliente**, **Indicador**), `docs/specs/modelo-de-dados.md` (convenções e seção 4), `docs/specs/fase-1-fundacao.md` (metadados de campo, histórico de alterações, padrão de listagem), `docs/specs/fase-1-configuracoes.md` (motor de cadastros auxiliares, `VocabularyPicker`, semente) e `docs/specs/fase-0-permissoes.md`. Esta spec é autossuficiente — não há histórico de conversa a recuperar.

## Objetivo

O módulo **Contatos**: o cadastro único de pessoas físicas e jurídicas com quem a corretora se relaciona, com papéis acumuláveis (comprador, proprietário, corretor externo). Entrega:

1. `contacts` e `contact_roles`, com documento validado e único, telefones em formato internacional e auditoria completa — inclusive dos papéis.
2. A **lista** de contatos (busca, filtros, atalho de WhatsApp) e a **ficha** com seções registráveis, onde as specs seguintes penduram as suas (perfil de compra, fazendas do proprietário, cadeia de indicação) sem editar este módulo.
3. O **`ContactField`**: o `ContactPicker` ligado à API, que acha o contato mesmo sem o papel pedido e o acrescenta ao salvar, mais o **cadastro rápido** dentro do seletor — os dois juntos são o que impede a duplicata nascer.
4. As **regras de "em uso"** como ponto de extensão: retirar papel e excluir contato ficam bloqueados enquanto algo os usa, e cada spec seguinte declara o próprio uso.
5. A semente de **Origens do lead** e **Classificações do cliente**.

## Vocabulário

`CONTEXT.md`: **Contato**, **Papel do contato**, **Comprador**, **Proprietário**, **Corretor externo**, **Documento do contato**, **Classificação do cliente**, **Escopo de dados**, **Histórico de alterações**, **Cadastro auxiliar**, **Entrada inativa**.

Na tela, o menu e a lista se chamam **Contatos**. Os papéis aparecem como "Comprador", "Proprietário" e "Corretor externo" (`CONTACT_ROLE_LABELS`, em `packages/shared`). Nunca "cliente" nem "lead" como nome de entidade.

## Decisões que governam

- `docs/specs/modelo-de-dados.md` — seção 4 (`contacts`, `contact_roles`); convenção de **junções auditáveis** (`id` uuid PK + `UNIQUE` do par); sem soft delete; FK para cadastro auxiliar é `ON DELETE RESTRICT`
- `fase-0-permissoes.md` — `contatos.ver|criar|editar|excluir` já estão no catálogo; o perfil Corretor tem ver, criar e editar, sem excluir; escopo `own` só em fazendas e oportunidades
- `fase-1-fundacao.md` — contrato de listagem e `ListPage`; histórico montado sob o próprio recurso com filhos declarados; registro de metadados de campo com teste de cobertura
- `fase-1-configuracoes.md` — `VocabularyField` para classificação e origem do lead; a semente vive em `TENANT_SEED` e é aplicada por migration e por `tenant:provision`

## Modelo de dados

### `contacts`

| Coluna | Tipo | Regra |
|---|---|---|
| `person_type` | text, `CHECK ('pf','pj')` | obrigatório |
| `name` | text NOT NULL | 1–200, sem espaços nas pontas. Em PJ é o **nome fantasia** (rótulo "Nome fantasia"); em PF, "Nome" |
| `legal_name` | text nulo | "Razão social", só PJ; limpo ao passar para PF |
| `tax_id` | text nulo | documento normalizado (abaixo). Índice único parcial `(tenant_id, tax_id) WHERE tax_id IS NOT NULL` |
| `email` | text nulo | minúsculas, sem espaços nas pontas, formato de e-mail |
| `phone`, `whatsapp` | text nulo | formato internacional (`+5564999990000`) |
| `classification_id` | uuid nulo → `contact_classifications` `RESTRICT` | só com o papel comprador |
| `lead_source_id` | uuid nulo → `lead_sources` `RESTRICT` | origem do lead |
| `relationship_origin` | text nulo | origem do relacionamento, texto livre, até 500 |
| `strategic_notes` | text nulo | observações estratégicas, até 10.000 |
| `custom_fields` | jsonb NOT NULL DEFAULT `'{}'` | criada agora, **sem uso** nesta spec (`fase-1-campos-personalizados`) |

Mais `id`, `tenant_id`, timestamps e RLS, pelas convenções. **Sem corretor responsável**: a base é compartilhada. Índice para a busca e a ordenação por nome (`(tenant_id, name)` com a collation pt-BR do ICU, como nos cadastros auxiliares).

### `contact_roles`

`id` uuid PK, `tenant_id`, `contact_id` → `contacts` `ON DELETE CASCADE`, `role` text `CHECK ('buyer','owner','external_broker')`, `UNIQUE (contact_id, role)`, timestamps, RLS. Junção auditável: é **filho declarado** do contato no histórico ("Papel adicionado: Comprador").

"Todo contato tem ao menos um papel" atravessa duas tabelas e é garantido no serviço, numa transação só com o contato.

### Semente

`TENANT_SEED` ganha dois cadastros, nas empresas novas (`tenant:provision`) e por migration nas existentes:

- **Origens do lead:** Evento, Indicação, Instagram, Placa na fazenda, Site, WhatsApp
- **Classificações do cliente:** A, B, C

A migration das existentes insere só o nome que a empresa ainda não tem (comparação sem caixa nem acento, a do índice único), para não colidir com entrada que um admin já tenha criado à mão.

## Regras de negócio

### Documento

- **Normalização:** sem pontuação nem espaços, letras em maiúsculas. Gravado assim; formatado só na exibição.
- **Validação pelo tipo de pessoa:** PF exige **CPF** (11 dígitos, dígitos verificadores); PJ exige **CNPJ** — numérico ou **alfanumérico** (12 posições `[0-9A-Z]` + 2 dígitos verificadores; cada caractere vale o código ASCII menos 48, mesmos pesos do módulo 11). Sequências repetidas (`11111111111`) são recusadas. Documento inválido é **400**, com a mensagem no campo.
- **Opcional.** Estrangeiro fica sem documento; passaporte vai em observações.
- **Único na empresa.** Documento já cadastrado é **409** e devolve o contato existente (`{ id, name }`), para o formulário oferecer o link "Abrir o cadastro de Fulano".
- **Funções puras em `packages/shared`**, as mesmas no Zod da API e no formulário: `normalizeTaxId`, `isValidCpf`, `isValidCnpj`, `formatTaxId`. `abbreviateTaxId` é **corrigida**: decide por CPF (11 dígitos) ou CNPJ (14 posições, numérico ou alfanumérico) a partir do valor normalizado — hoje conta só os dígitos, e um CNPJ alfanumérico com exatamente 11 dígitos sai mascarado como CPF. CPF continua mascarado na listagem (`***.456.789-**`); CNPJ sai inteiro.

### Telefones

- **Formato internacional** gravado: `+` seguido de 8 a 15 dígitos. Entrada sem `+` é brasileira: `+55` + DDD válido + 8 ou 9 dígitos (10 ou 11 no total). Com `+` e outro código de país, aceita-se a faixa geral de 8 a 15 dígitos, sem validação por país.
- Função pura `normalizePhone` em `packages/shared`, mais `formatPhone` para exibição (`(64) 99999-0000` no Brasil; o internacional como veio).
- **"WhatsApp é o mesmo número"**: opção do formulário, marcada por padrão em contato novo, que copia o telefone para o WhatsApp ao salvar. Não há coluna para ela: ao abrir a ficha para edição, vem marcada quando os dois valores são iguais.
- **Atalhos:** WhatsApp abre `https://wa.me/<dígitos>` em nova aba — no desktop isso cai no WhatsApp Desktop ou no WhatsApp Web, que é como o cliente usa no computador; telefone abre `tel:`; e-mail abre `mailto:`. Na lista (desktop e mobile), na ficha e no cartão do mobile.

### Mínimo para salvar

**Nome, tipo de pessoa e ao menos um papel.** Todo o resto é opcional — inclusive os meios de contato: o fazendeiro que indicou alguém às vezes só tem nome.

### Campos por papel

| Campo | Aparece quando |
|---|---|
| Classificação do cliente | o contato tem o papel **comprador** |
| Origem do lead, origem do relacionamento, observações estratégicas | sempre, qualquer papel |
| Razão social | pessoa jurídica |

A API recusa (400) `classificationId` em contato sem o papel comprador.

### Avisos de duplicata

Além do bloqueio por documento, o formulário (completo e rápido) consulta, antes de salvar, os contatos que coincidem em **telefone**, **WhatsApp** (comparados entre si, em qualquer combinação dos dois), **e-mail** ou **nome** (igual sem caixa nem acento). Havendo coincidência, mostra a lista com o motivo de cada uma ("mesmo WhatsApp", "mesmo nome") e o link para cada cadastro, e oferece **salvar mesmo assim** — é aviso, não bloqueio: dois sócios usam o mesmo e-mail da empresa. Na edição, o próprio contato é excluído da consulta.

### Papéis

- Acumuláveis; ao menos um sempre. Retirar o último é **400**.
- **Retirar papel em uso é 409**, dizendo onde: "João é proprietário de 2 fazendas; troque o proprietário antes de retirar o papel." O uso é declarado (abaixo).
- **Retirar papel fora de uso apaga os dados exclusivos dele**, no mesmo save: tirar comprador limpa `classification_id` (e, quando existir, o perfil de compra). O front pede confirmação dizendo o que será apagado; o histórico guarda os valores anteriores.

### Exclusão

- Física, com `contatos.excluir` (o Corretor não tem). Sem estado "inativo".
- **Contato em uso é 409**, dizendo onde ("Este contato está em uso em Fazendas. Remova os vínculos antes de excluir."). A recusa vem da FK `RESTRICT` que cada spec consumidora cria para `contacts`, traduzida para o rótulo da entidade da tabela que referencia, pelos metadados de campo. Os papéis vão junto (`CASCADE`).

### Uso declarado — o ponto de extensão

Um registro no módulo de contatos declara, por papel, onde ele está em uso: a tabela, a coluna que aponta para o contato, e os rótulos singular/plural da entidade ("fazenda"/"fazendas"). O serviço conta as linhas de cada declaração do papel retirado, dentro da transação do save. **Nesta spec o registro nasce vazio**: a primeira declaração é a de `fase-1-fazendas` (`owner` → `farms.owner_contact_id`); seguem `cadeia-de-indicacao` (`external_broker` → `referral_links.referrer_contact_id`), oportunidades (`buyer` → `opportunities.contact_id`) e comissão (`external_broker` → `commission_members.party_contact_id`). Declarar o uso é parte do critério de aceite de cada uma dessas specs.

### Acesso

- **Base compartilhada:** quem tem `contatos.ver` vê todos os contatos da empresa. O escopo de dados **não se aplica** ao módulo — as rotas de contatos não aplicam a cláusula de escopo, e a futura tela de perfis de acesso (Fase 3) não oferece `own` para Contatos.
- `contatos.ver`: lista, ficha, histórico, busca do seletor, consulta de duplicatas. `contatos.criar`: criar (inclusive o cadastro rápido). `contatos.editar`: editar, incluir e retirar papel. `contatos.excluir`: excluir. Sem a permissão, **403 antes do banco**.
- **Hidratação por id sem `contatos.ver`:** `GET /contacts/options?ids=` responde a qualquer vínculo, mas sem `contatos.ver` devolve só `id` e `name` (documento nulo, papéis vazios). É o que deixa uma ficha de fazenda mostrar o nome do proprietário para quem não pode buscar contatos.
- Contato de outra empresa é **404** em toda rota.

### Seletor de contato e cadastro rápido

- A busca com `role` **não filtra**: ordena primeiro quem já tem o papel, depois os demais, cada grupo por nome. É o que deixa achar o João-comprador ao escolher o proprietário.
- O `ContactPicker` marca a opção fora do papel com "vira proprietário ao salvar" (o rótulo do papel em minúsculas, de `CONTACT_ROLE_LABELS`).
- **Quem acrescenta o papel é a spec consumidora**, no save do próprio registro e na mesma transação (`fase-1-fazendas` ao gravar o proprietário). Esta spec entrega a operação de serviço "garantir papel" (idempotente, auditada) para elas chamarem.
- **Cadastro rápido:** o botão "Cadastrar" do seletor (só com `contatos.criar`) abre um diálogo com nome (pré-preenchido com o termo buscado), tipo de pessoa e o papel pedido pelo seletor, já marcado (os demais podem ser acrescentados). Passa pelos avisos de duplicata e pelo 409 do documento. Ao salvar, o contato novo volta selecionado. Um diálogo só, o mesmo em todo seletor.
- Sem `contatos.ver`, o `ContactField` aparece **somente leitura**, com o nome hidratado.

### Auditoria

Toda escrita passa pelo wrapper — contato e papéis, num `change_id` por save. `contacts` e `contact_roles` entram nos metadados de campo; `role` com os rótulos de exibição; `custom_fields` oculto no histórico nesta spec. Documento, telefones e e-mail aparecem formatados no histórico.

## Contratos de API

Todas sob `/e/:tenant/contacts`.

```
GET    /                    → 200 { items, total, page, pageSize }                (contatos.ver)
         ?page&pageSize&sort=name|-name|createdAt|-createdAt&q
         &role=buyer,owner&personType=pf|pj&classificationId&leadSourceId&createdFrom&createdTo
GET    /options             → 200 { items: ContactOption[], nextCursor? }          (contatos.ver; com só ids, qualquer vínculo — ver Acesso)
         ?q&cursor&role&ids=<id,id>
GET    /duplicates          → 200 { items: [{ id, name, roles, reasons: ('phone'|'whatsapp'|'email'|'name')[] }] }   (contatos.ver)
         ?name&phone&whatsapp&email&excludeId
GET    /:id                 → 200 contato com roles                               (contatos.ver)
GET    /:id/history         → 200 histórico (fundação), filhos: contact_roles     (contatos.ver)
POST   /                    → 201 contato                                         (contatos.criar)
PATCH  /:id                 → 200 contato   (roles, se presente, substitui o conjunto)   (contatos.editar)
DELETE /:id                 → 204                                                 (contatos.excluir)
```

- `q` busca, sem distinguir caixa nem acento, em nome, razão social, documento (normalizado, e o termo também), e-mail, e telefone e WhatsApp pelos dígitos. Ordenação termina em `id`.
- `role` na listagem é **filtro** (contatos com qualquer um dos papéis); em `/options` é **ordenação** (ver Seletor).
- Erros: 400 validação (inclusive documento inválido, sem papel, classificação sem comprador); 403 sem permissão; 404 inexistente ou de outra empresa; 409 documento duplicado (com `{ id, name }` do existente), papel em uso, contato em uso — com a mensagem pronta para exibir.
- Amostra nova em `apps/api/test/response-sweep.integration.test.ts`.

## Telas e componentes

**`apps/web`** (`modules/contacts`):

- **Menu "Contatos"**, visível com `contatos.ver`.
- **Lista** em `/e/<tenant>/contacts`, sobre a `ListPage`: busca; filtros papel (múltiplo), tipo de pessoa, classificação e origem do lead (`VocabularyField` em modo filtro) e data de cadastro (`DateRangePicker`). Colunas: nome (com razão social abaixo, em PJ), papéis (`Badge`), documento abreviado, telefone, classificação, cadastrado em, e o atalho de WhatsApp. Ordem padrão por nome. Cartão do mobile: nome, papéis, telefone e o atalho de WhatsApp. Botão "Novo contato" com `contatos.criar`.
- **Formulário** (`/contacts/new` e `/contacts/:id/edit`, sobre `EntityForm`): tipo de pessoa, nome / nome fantasia, razão social (PJ), documento, papéis, telefone, WhatsApp com "é o mesmo número", e-mail, classificação (só comprador), origem do lead, origem do relacionamento, observações estratégicas. Avisos de duplicata e o 409 do documento aparecem no formulário, sem perder o que foi digitado. Retirar papel com dados exclusivos pede `ConfirmDialog`.
- **Ficha** em `/e/<tenant>/contacts/:id`: cabeçalho com nome, papéis e os atalhos (WhatsApp, ligar, e-mail); ações editar e excluir conforme as permissões. Corpo em **seções registráveis**: esta spec registra **Dados** e **Histórico de alterações** (`record-history`).
- **Seções registráveis da ficha:** mecanismo genérico de `apps/web` (fica fora de `packages/ui` porque depende do roteador e do TanStack Query, como a `ListPage`), reaproveitado depois pela ficha da fazenda. Cada seção declara chave, título, ordem, a condição de exibição (papéis do contato e/ou permissão) e o componente, que recebe o registro. Uma spec acrescenta a sua seção registrando-a, sem editar a ficha.
- **`ContactField`**: o `ContactPicker` ligado a `/options` da empresa ativa (como o `VocabularyField` faz com o `VocabularyPicker`), com o cadastro rápido e o modo somente leitura. Nenhum módulo escreve a sua busca de contato.

**`packages/ui`:**

- **`ContactPicker`**: a marca "vira \<papel\> ao salvar" na opção fora do papel pedido; stories da variante e do botão "Cadastrar".
- **`TaxIdInput`** (máscara conforme o tipo de pessoa, CNPJ alfanumérico incluído) e **`PhoneInput`** (`+55` pré-preenchido, outro país aceito), sobre as funções puras de `packages/shared`, com stories. Servem a contatos e, depois, a qualquer cadastro com documento ou telefone.
- Nenhuma aparência fora das receitas de `styles.ts`.

## Critérios de aceite

**Cadastro e documento**

1. **Integração:** criar contato só com nome, tipo de pessoa e um papel; sem papel é 400; PJ com razão social; passar para PF limpa a razão social.
2. **Unitário:** `isValidCpf` e `isValidCnpj` aceitam documentos válidos (CNPJ numérico e alfanumérico) e recusam dígito verificador errado, tamanho errado e sequência repetida; `normalizeTaxId` remove pontuação e põe maiúsculas.
3. **Unitário:** `abbreviateTaxId` mascara CPF, devolve CNPJ inteiro e formatado (numérico e alfanumérico) e não confunde com CPF um CNPJ alfanumérico de exatamente 11 dígitos.
4. **Integração:** documento formatado e sem formatação gravam o mesmo valor; CPF em PJ e CNPJ em PF são 400; documento repetido na empresa é 409 com o contato existente; duas empresas podem ter o mesmo documento; vários contatos sem documento convivem.
5. **Unitário:** `normalizePhone` converte `(64) 99999-0000` em `+5564999990000`, recusa DDD inexistente e tamanho errado, e aceita `+351…` na faixa geral.

**Papéis e uso**

6. **Integração:** `PATCH` com `roles` substitui o conjunto; retirar o último papel é 400; incluir e retirar papel aparecem no histórico como filhos ("Papel adicionado: Comprador").
7. **Integração:** retirar o papel comprador apaga a classificação no mesmo save, e o histórico guarda o valor anterior; `classificationId` em contato sem comprador é 400.
8. **Integração:** com uma declaração de uso de papel feita **pelo registro de produção** sobre uma tabela que o teste cria na própria transação, retirar o papel em uso é 409 com a mensagem da contagem; fora de uso, passa.
9. **Integração:** excluir contato referenciado por uma FK `RESTRICT` (tabela criada pelo teste na transação) é 409 com o rótulo da entidade; sem referência, 204, e os papéis somem junto.
10. **Integração:** a operação "garantir papel" acrescenta o papel uma vez só (idempotente) e registra no histórico.

**Duplicatas**

11. **Integração:** `/duplicates` acha coincidência por telefone, por WhatsApp contra telefone e vice-versa, por e-mail e por nome sem caixa nem acento, com o motivo de cada uma; `excludeId` tira o próprio contato.

**Listagem e seletor**

12. **Integração:** a listagem pagina com `total` correto; busca acha por nome sem acento, por documento digitado com pontuação, por telefone digitado de qualquer jeito e por e-mail; filtros por papel (qualquer um dos escolhidos), tipo de pessoa, classificação, origem do lead e intervalo de cadastro; ordenação por nome e por data com desempate por `id`.
13. **Integração:** `/options?role=owner` traz primeiro quem tem o papel e depois os demais; `ids` hidrata; sem `contatos.ver`, `ids` devolve só id e nome, e a busca por termo é 403.

**Acesso**

14. **Integração:** usuário com o perfil Corretor vê o contato que outro corretor cadastrou (base compartilhada) e recebe 403 ao excluir; sem `contatos.ver`, lista, ficha, histórico e duplicatas são 403; sem `contatos.criar`/`editar`, as escritas são 403.
15. **Integração:** contato de outra empresa é 404 em toda rota (RLS).

**Semente**

16. **Integração:** `tenant:provision` cria as origens do lead e as classificações do cliente na transação da empresa, auditadas com autor nulo.
17. **Unitário:** a migration da semente contém exatamente os valores da constante de `packages/shared`; a das empresas existentes não insere nome que a empresa já tem.

**Telas**

18. **Front (API falsa):** a lista mostra os contatos, aplica filtro pela URL e abre o WhatsApp em `wa.me`; a ficha mostra as seções registradas, e uma seção condicionada ao papel comprador aparece só quando o contato o tem.
19. **Front (API falsa):** o formulário mostra o aviso de duplicata com os links e salva com "salvar mesmo assim"; o 409 do documento aparece no campo com o link para o existente, sem perder o digitado; retirar o papel comprador com classificação pede confirmação.
20. **Front (API falsa):** o `ContactField` marca a opção fora do papel, cadastra pelo diálogo rápido e devolve o contato novo selecionado; sem `contatos.criar` não há "Cadastrar"; sem `contatos.ver`, aparece somente leitura com o nome.
21. Stories de `ContactPicker` (opção fora do papel, "Cadastrar"), `TaxIdInput` e `PhoneInput` passando em `test/stories.test.tsx`.
22. Teste de cobertura de metadados verde com `contacts` e `contact_roles`; teste de schema de FK `RESTRICT` dos cadastros auxiliares verde com as FKs novas; `tsc --noEmit` limpo; migrations aplicam de banco zerado; `pnpm lint` verde.
23. No navegador (`pnpm dev`): cadastrar um comprador PJ com CNPJ e WhatsApp, ver o aviso ao cadastrar outro com o mesmo WhatsApp, abrir o WhatsApp pela lista no desktop, retirar o papel comprador e ver a mudança no histórico.

## Fora de escopo

- **Mesclar** contatos duplicados
- Ligação entre contatos (representante de PJ, sócios) — o representante vai em observações ou em outro contato sem vínculo; tabela aditiva se aparecer o caso
- Endereço do contato — o modelo não tem
- Documento estrangeiro estruturado (passaporte) — vai em observações
- **Perfil de compra** (`fase-1-perfil-de-compra`), que registra a sua seção na ficha condicionada ao papel comprador
- Gravação do papel pelos consumidores do seletor e as declarações de uso — de cada spec consumidora
- Histórico de atendimentos (atividades, Fase 3) e histórico de negociações (oportunidades, Fase 2), que entram como seções da ficha
- Campos personalizados — só a coluna nasce aqui
- Eliminação de dados pessoais a pedido do titular (LGPD), que anonimiza o `audit_log` — Fase 5
- Exportação da lista — Fase 4

## Depende de

`fase-1-fundacao` (metadados de campo, histórico, padrão de listagem) e `fase-1-configuracoes` (`lead_sources`, `contact_classifications`, `VocabularyField`, `TENANT_SEED`).
