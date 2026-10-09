# Modelo de dados completo

> **Leitura obrigatória:** `CLAUDE.md`, `CONTEXT.md` (glossário), as três ADRs em `docs/adr/`, e as seções "Arquitetura multi-tenant e segurança" e "Modelo de dados" do `Plano_Geral_de_Desenvolvimento.md`.

Todas as tabelas das seis fases, desenhadas de uma vez. O objetivo é que as migrations entre fases sejam **somente aditivas** — tabela nova ou coluna nula — e nunca reestruturação de tabela com dados de cliente dentro. Tabelas de fases posteriores são criadas quando a fase chegar; o que é fechado agora é a *forma*.

A coluna **Fase** indica quando a tabela nasce.

---

## Convenções

Aplicam-se a toda tabela, e não se repetem nas listagens abaixo.

**Chave primária:** `uuid`, gerada na aplicação como **UUIDv7** (ordenada no tempo, preserva localidade de índice). Não sequencial, porque IDs aparecem na URL — com `bigint` qualquer pessoa descobre quantas fazendas a corretora tem e enumera registros. Exceção: `audit_log` usa `bigint` identity (alto volume, nunca aparece em URL) e `municipalities` usa o código IBGE.

**Toda tabela de negócio carrega** `tenant_id uuid NOT NULL REFERENCES tenants`, policy de RLS e `FORCE ROW LEVEL SECURITY`. Isso inclui **tabelas de junção** — sem `tenant_id` nelas, a policy não tem o que filtrar.

**Timestamps:** `created_at` e `updated_at`, ambos `timestamptz NOT NULL DEFAULT now()`, sempre em UTC. Autoria não fica em coluna: o `audit_log` registra quem fez cada alteração.

**Sem soft delete.** `deleted_at` obrigaria `WHERE deleted_at IS NULL` em toda query — e esquecer um é vazar registro apagado —, além de brigar com índices únicos. Onde o domínio precisa de "inativo", existe coluna explícita (`active`). Exclusão é física e auditada.

**Tipos numéricos:** dinheiro `numeric(16,2)`; percentual `numeric(7,4)`; área `numeric(12,4)`, **sempre em hectares**; coordenada `numeric(10,7)`.

**Identificadores em inglês, snake_case** (convenção da stack); rótulos em pt-BR vivem no registro de metadados de campo em `packages/shared`.

**Significados de sistema** usam `text` + `CHECK` de lista fechada, não enum do Postgres — enum é doloroso de alterar. Vocabulários configuráveis pelo tenant são tabelas.

**Campos polimórficos:** duas colunas FK nulas + `CHECK` de que exatamente uma está preenchida (`num_nonnulls(a, b) = 1`).

---

## 1. Autenticação e plataforma — **fora do RLS**

Estas tabelas **não** carregam policy por tenant. O vínculo usuário↔empresa é o que *define* a pertinência: filtrá-lo por tenant seria circular e quebraria o login. O isolamento aqui é da camada de aplicação, e a exceção é nominal no teste de schema que varre o CI.

| Tabela | Fase | Colunas distintivas |
|---|---|---|
| `tenants` | 0 | `slug` text UNIQUE (vai na URL), `name`, `legal_name`, `tax_id`, `active` |
| `users` | 0 | Better Auth, mais `is_super_admin boolean NOT NULL DEFAULT false` — marcada só por CLI, removida de toda serialização |
| `sessions`, `accounts`, `verifications` | 0 | Forma da biblioteca |
| `memberships` | 0 | `user_id`, `tenant_id`, `is_default boolean`. UNIQUE `(user_id, tenant_id)`; índice único parcial em `(user_id) WHERE is_default` garante no máximo uma empresa padrão por usuário |
| `permissions` | 0 | Catálogo global, definido em código e sincronizado por migration. `code` text PK (`fazendas.criar`), `module`, `action`, `scope` CHECK `('tenant','platform')`, `description` |
| `user_platform_permissions` | 0 | `user_id`, `permission_code` (só `scope='platform'`), `granted_at`, `granted_by`. **Vazia na Fase 0** — só o `is_super_admin` passa pelas permissões de plataforma. É a estrutura que o AdminMaster usará quando existir, sem reestruturação |
| `municipalities` | 1 | `ibge_code` text PK, `name`, `uf` char(2), `region`. Dado de referência público, carga do IBGE, compartilhado entre tenants |

---

## 2. Permissões e auditoria por tenant

| Tabela | Fase | Colunas distintivas |
|---|---|---|
| `access_profiles` | 0 | `name`, `description`, `is_seeded boolean`. UNIQUE `(tenant_id, name)`. Admin, Gestor e Corretor entram semeados |
| `profile_permissions` | 0 | `profile_id`, `permission_code`. PK composta. Só aceita permissão de `scope='tenant'` — perfil de tenant não pode conceder poder sobre outros tenants |
| `profile_data_scopes` | 0 | `profile_id`, `module`, `scope` CHECK `('own','all')`. PK `(profile_id, module)`. `own` significa ser o **corretor responsável** pelo registro — não ter o perfil de acesso Corretor |
| `user_profiles` | 0 | `user_id`, `profile_id`. PK composta. Vale a união das permissões |
| `audit_log` | 0 | `bigint` identity PK. `tenant_id` (nulo para ação de plataforma), `entity`, `entity_id`, `field`, `old_value` text, `new_value` text, `user_id` (nulo para ação de CLI/sistema), `created_at`. Índices `(tenant_id, entity, entity_id, created_at DESC)` e `(tenant_id, created_at DESC)`. Valores em `text` para caber qualquer tipo; a formatação é dos metadados de campo |

---

## 3. Configuração por tenant

| Tabela | Fase | Colunas distintivas |
|---|---|---|
| `tenant_settings` | 1 | `tenant_id` PK (1:1). `default_alqueire_type` CHECK `('goiano','paulista','norte')`, `area_display_unit` CHECK `('hectare','alqueire')`, `currency` DEFAULT `'BRL'`, `default_pricing_basis` CHECK `('gross','net')`, `default_commission_percent`, e os limiares de inércia: `forgotten_client_days`, `stalled_deal_days`, `owner_no_return_days` |
| `custom_field_defs` | 1 | `entity`, `key`, `label`, `type` CHECK `('text','number','date','boolean','select')`, `options` jsonb, `required`, `display_order`, `active`. UNIQUE `(tenant_id, entity, key)` |
| `matching_rules` | 2 | `criterion` CHECK `('region','area_range','value_range','aptitude','crop')`, `weight`, `active`. UNIQUE `(tenant_id, criterion)` |
| `taxes` | 2 | `name`, `rate`, `active`. UNIQUE `(tenant_id, name)`. Sem histórico de vigência próprio: o `audit_log` registra mudança de alíquota e cada venda congela a sua em `sale_taxes` |
| `crop_quotes` | 1 | `crop_id`, `trading_post_id`, `quote_date` date, `price_per_bag`. UNIQUE `(tenant_id, crop_id, trading_post_id, quote_date)`; índice com `quote_date DESC` para buscar a vigente. **Não existe cotação nacional única** — a praça faz parte da chave |

### Vocabulários configuráveis

Forma comum: `name` text, `display_order` int, `active` boolean, UNIQUE `(tenant_id, name)`.

| Tabela | Fase | Observação |
|---|---|---|
| `aptitudes`, `crops`, `lead_sources`, `document_categories`, `gallery_types`, `trading_posts`, `payment_methods`, `activity_types`, `contact_classifications`, `purchase_profiles` | 1 | Forma comum, sem significado de sistema |
| `commercial_statuses` | 1 | `system_meaning` NOT NULL CHECK `('available','negotiating','sold','suspended')` |
| `pipeline_stages` | 2 | `system_meaning` NOT NULL CHECK `('open','won','lost')`. As 10 etapas do escopo entram semeadas |
| `sale_statuses` | 2 | `system_meaning` NOT NULL CHECK `('in_progress','completed','cancelled')` |

**Por que o significado de sistema:** a empresa renomeia, reordena e cria quantas entradas quiser, mas o sistema precisa calcular. "Valor Vendido" precisa saber quais entradas contam como concluída, "Tempo Médio para finalizar venda" precisa saber onde termina, e comissão devida só vale sobre venda concluída. Cada entrada aponta para exatamente um significado da lista fechada.

---

## 4. Contatos — **Fase 1**

| Tabela | Colunas distintivas |
|---|---|
| `contacts` | `person_type` CHECK `('pf','pj')`, `name`, `legal_name`, `tax_id`, `email`, `phone`, `whatsapp`, `classification_id` → `contact_classifications`, `lead_source_id` → `lead_sources` (origem do lead), `relationship_origin` text (origem do relacionamento — conceito distinto, texto livre), `strategic_notes` text, `custom_fields` jsonb |
| `contact_roles` | `contact_id`, `role` CHECK `('buyer','owner','external_broker')`. PK `(contact_id, role)`. **Acumuláveis**: o parceiro que indica um comprador hoje pode ser o comprador de amanhã, no mesmo cadastro |
| `buyer_profiles` | `contact_id` PK (1:1 opcional). O **perfil de compra**: `purchase_profile_id` → `purchase_profiles` (investidor, produtor, especulador…), `avg_ticket`, `max_ticket`, `min_area_ha`, `max_area_ha`, `estimated_net_worth`, `investment_capacity`, `urgency` CHECK `('low','medium','high')`, `qualification_level` CHECK `('cold','warm','hot','qualified')` |
| `buyer_regions` | `contact_id`, `municipality_ibge_code` nulo, `uf` char(2) nulo, `CHECK num_nonnulls(...) = 1`. Permite "interessado em Goiás" (UF) e "interessado em Rio Verde" (município); o matching testa a fazenda contra os dois |
| `buyer_crops` | `contact_id`, `crop_id` |
| `buyer_payment_methods` | `contact_id`, `payment_method_id` |

---

## 5. Cadeia de indicação — **Fase 1**

| Tabela | Colunas distintivas |
|---|---|
| `referral_links` | Sujeito polimórfico: `subject_contact_id` / `subject_farm_id`, exatamente um. Indicador polimórfico: `referrer_user_id` / `referrer_contact_id`, exatamente um. Mais `position` int (1 = quem trouxe direto) e `notes`. Índices `(tenant_id, subject_contact_id, position)` e `(tenant_id, subject_farm_id, position)` |

Modela "o Pedro veio pelo João, que pegou com o Sebastião" e "essa fazenda veio pelo corretor Carlos, que soube pelo Antônio", em N níveis, para os dois lados, sem depender de o proprietário estar identificado. **Independente da comissão:** quem indica não necessariamente recebe, e quem recebe não necessariamente indicou.

---

## 6. Fazendas — **Fase 1**

### `farms`

**Identificação e responsabilidade:** `name`, `municipality_ibge_code`, `owner_contact_id` **nulo** (proprietário é opcional — muitas vezes só é identificado depois), `responsible_user_id` (corretor responsável), `trading_post_id` (praça de referência, normalmente derivada do município mas sobrescrevível).

**Áreas:** `total_area_ha`, `usable_area_ha`. Sempre hectares.

**Técnico:** `aptitude_id`, `soil`, `topography`, `water`, `water_availability`, `irrigation_potential`, `distance_to_highway_km`, `distance_to_warehouse_km`, `historical_productivity`, `productive_potential`, `infrastructure`, `document_status`, `technical_summary`, `differentials`, `latitude`, `longitude`.

**Comercial:** `commercial_status_id`, `sales_potential` CHECK `('high','medium','low')`, `priority` CHECK `('high','medium','low')`.

**Precificação**, com discriminador:

- `pricing_mode` NOT NULL CHECK `('brl','bags')`
- modo `brl`: `asking_price`
- modo `bags`: `valuation_bags` numeric(14,4), `valuation_bags_unit` CHECK `('per_hectare','per_alqueire')`, `valuation_crop_id`
- `CHECK` garantindo que o conjunto do modo escolhido está preenchido

**Derivados, nunca colunas:** valor por hectare, valor por hectare útil, valor em sacas, faixa de valor, e o equivalente em reais de uma avaliação em sacas. Uma avaliação é valor **móvel** — muda todo dia com a cotação, sem ninguém tocar no cadastro —, então persistir o equivalente seria guardar um número que envelhece em silêncio. O histórico de alterações registra mudança na quantidade de sacas, não a variação diária da cotação.

**Extensão:** `custom_fields` jsonb.

| Tabela | Colunas distintivas |
|---|---|
| `farm_galleries` | `farm_id`, `gallery_type_id`, `name`, `display_order` |
| `farm_media` | `farm_id`, `gallery_id`, `kind` CHECK `('photo','video')`, `r2_key`, `filename`, `content_type`, `size_bytes`, `width`, `height`, `duration_seconds`, `display_order` |
| `farm_documents` | `farm_id`, `document_category_id`, `r2_key`, `filename`, `content_type`, `size_bytes`, `notes` |

---

## 7. Comercial — **Fase 2**

| Tabela | Colunas distintivas |
|---|---|
| `opportunities` | `contact_id` (o comprador), `responsible_user_id`, `stage_id`, `probability`, `potential_value`, `notes`. Mais a **demanda**: `target_area_ha`, `min_value`, `max_value`, `aptitude_id` nulo. Índices `(tenant_id, stage_id)` e `(tenant_id, responsible_user_id)` |
| `opportunity_regions` | `opportunity_id`, `municipality_ibge_code` / `uf`, exatamente um — mesma forma de `buyer_regions` |
| `opportunity_crops` | `opportunity_id`, `crop_id` |
| `opportunity_farms` | **Fazendas candidatas.** `opportunity_id`, `farm_id`, `added_at`, `notes`. UNIQUE `(opportunity_id, farm_id)`. **Nenhuma carga comercial, nenhum sinalizador de vendido** — ver ADR 0001 |
| `activities` | **Fase 3.** `activity_type_id`, vínculo a `opportunity_id` / `contact_id` / `farm_id` (ao menos um, `CHECK num_nonnulls(...) >= 1`), `responsible_user_id`, `scheduled_at`, `completed_at` nulo, `is_next_action` boolean, `subject`, `notes`. Índice `(tenant_id, responsible_user_id, scheduled_at)` para a agenda |
| `due_diligence_templates` | **Fase 3.** `name`, `display_order`, `active`. Os cinco do escopo — jurídico, ambiental, fundiário, fiscal, documental — entram semeados |
| `due_diligence_template_items` | **Fase 3.** `template_id`, `label`, `display_order`, `required` |
| `due_diligence_items` | **Fase 3.** `opportunity_id`, `template_item_id` nulo (permite item ad-hoc), `label` **copiado**, `status` CHECK `('pending','ok','issue','na')`, `notes`, `resolved_at`, `resolved_by`. O rótulo é copiado para que editar o template não reescreva checklist de negociação já em andamento |

**A demanda pertence à oportunidade, não ao contato.** O mesmo investidor pode ter uma oportunidade buscando soja em Goiás e outra buscando pecuária no Mato Grosso, e o perfil de compra permanente não representa as duas ao mesmo tempo. Os critérios nascem pré-preenchidos do perfil de compra na criação e depois são editáveis.

---

## 8. Venda — **Fase 2**

| Tabela | Colunas distintivas |
|---|---|
| `sales` | `opportunity_id`, `farm_id`, `sale_status_id`, `closed_at` date, `area_sold_ha` (venda parcial), `gross_value` NOT NULL, `net_value` NOT NULL, `pricing_basis` CHECK `('gross','net')`, `cancellation_reason` nulo, `notes`. Congelamento da cotação, nulo quando a precificação foi em reais: `quote_crop_id`, `quote_trading_post_id`, `quote_date`, `quote_price_per_bag`. Índice `(tenant_id, sale_status_id, closed_at)` |
| `sale_taxes` | `sale_id`, `tax_id` (referência), `tax_name` **copiado**, `rate` **congelada**, `amount`. O nome é copiado para sobreviver a renomear ou excluir o imposto no catálogo |
| `sale_installments` | `sale_id`, `sequence` int, `due_date` date, `amount`, `settled_at` date nulo, `notes`. UNIQUE `(sale_id, sequence)` |

**Uma linha por fazenda vendida**, não por oportunidade: quem precisa de 1.000 ha pode fechar cinco fazendas de 200 ha, e cada uma é uma venda (ADR 0001). A mesma fazenda pode ser vendida, o negócio cair e ela ser vendida de novo — cada tentativa com sua linha e seu motivo de cancelamento preservado.

**`net_value` é persistido de propósito.** Não é desnormalização por preguiça: é congelamento contratual. É a base de cálculo da comissão, e recalculá-lo depois a partir de alíquotas que podem ter mudado reescreveria retroativamente comissão já paga.

**O proprietário informa o bruto; a comissão incide sobre o líquido.** `pricing_basis` é explícito, nunca inferido — o contrato precisa dizer expressamente qual dos dois é a base, então o sistema não adivinha.

**Venda parcial é exceção** (cerca de 3 em 100), então não há entidade de desmembramento: `area_sold_ha` e `notes` registram o que houve, a área remanescente da fazenda é ajustada pelo corretor, e a auditoria guarda a mudança.

---

## 9. Comissão

| Tabela | Fase | Colunas distintivas |
|---|---|---|
| `commission_groups` | 2 | `sale_id` (**não** `opportunity_id`), `name`, `percent` — % sobre o valor líquido |
| `commission_members` | 2 | `group_id`, participante polimórfico `party_user_id` / `party_contact_id` (exatamente um), `percent` nulo. Nulo significa divisão igual entre os membros do grupo; preenchido sobrescreve |
| `commission_installments` | 3 | `member_id`, `sale_installment_id` nulo (vincula ao cronograma da venda), `sequence`, `due_date`, `expected_amount` (**previsto**), `received_amount` nulo (**recebido**, congelado na baixa), `received_at`, `payment_notes` text |

**A comissão pertence à venda porque é obrigação do vendedor.** Cinco fazendas fechadas na mesma oportunidade são cinco proprietários, cinco vendedores e cinco acordos distintos, cada um possivelmente com cadeia de indicação e participantes próprios.

**A parcela pendura no membro, não no grupo**, porque o pagamento vai para uma pessoa.

**Previsto e recebido são duas colunas, não uma.** Na vida real a comissão é paga em dinheiro, em sacas, em permuta de bens, imóveis ou veículos; o sistema trabalha sempre em reais e registra a forma efetiva em `payment_notes`. Os dois valores divergem quando o combinado foi em sacas e o pagamento seguiu a cotação do dia — e é essa divergência que o administrador precisa enxergar. Com um número só, ou a previsão vira ficção ou o histórico do recebimento se perde.

**Sequenciamento (Q31):** o *acordo* — grupos e membros — entra na Fase 2 e fecha o marco dos 3 meses. O *ledger* — `commission_installments` — entra na Fase 3. A tabela é desenhada agora para que a migration da Fase 3 seja puramente aditiva, sem tocar no que já tem dados do cliente.

---

## Decisões que eu tomei e você deve revisar

Onde não havia definição explícita nas dez rodadas, escolhi e marquei aqui. Nenhuma é irreversível antes da primeira migration.

1. **UUIDv7 como PK**, em vez de `bigint` sequencial. Custa um pouco mais de índice; evita enumeração de registros pela URL.
2. **Sem soft delete** em nenhuma tabela.
3. **`audit_log` com PK `bigint`**, por volume, e `tenant_id` nulo para ações de plataforma.
4. **`net_value` persistido** em `sales`, não calculado na leitura.
5. **Nome e alíquota do imposto copiados** para `sale_taxes`, além do FK.
6. **Região como município *ou* UF** (duas colunas, uma preenchida), em `buyer_regions` e `opportunity_regions`. A alternativa seria só município, o que obrigaria listar 246 municípios para dizer "interessado em Goiás".
7. **Due diligence como template + instância**, com o rótulo copiado na instância.
8. **`sales_potential` e `priority` como `CHECK`**, não vocabulário configurável — não estavam na lista de vocabulários do plano. Se a Grand Vista quiser renomear essas faixas, viram tabela.
9. **`qualification_level` como `CHECK`** de quatro valores (`cold`, `warm`, `hot`, `qualified`) — os nomes são chute meu, o escopo só diz "grau de qualificação".
10. **`activities` com vínculo a oportunidade, contato ou fazenda**, ao menos um, em qualquer combinação.
11. **`relationship_origin` como texto livre**, separado de `lead_source_id`. O escopo lista "origem do lead" e "origem do relacionamento" como campos distintos, sem dizer como diferem.

## Fora do RLS, lista nominal

`tenants`, `users`, `sessions`, `accounts`, `verifications`, `memberships`, `permissions`, `municipalities`.

Todo o resto carrega `tenant_id`, policy e `FORCE ROW LEVEL SECURITY`. O teste de schema da Fase 0 usa exatamente esta lista como exceção e **falha o CI** diante de qualquer tabela de negócio sem os três.
