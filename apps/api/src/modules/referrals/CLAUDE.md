# referrals

Cadeia de indicação (`referral_links`): "o Pedro veio pelo João, que soube pelo Sebastião". Independente da comissão.

- **Spec:** `docs/specs/fase-1-cadeia-de-indicacao.md`; ADR 0005; issues #186 (contato) e #187 (fazenda).
- **Tabela que possui:** `referral_links`, completa para os dois sujeitos (contato e fazenda). As duas restrições de posição são `DEFERRABLE INITIALLY DEFERRED`, escritas à mão na migration `0028`.
- **Depende de:** `@crm/db`, `@crm/shared` (regra pura e schemas), `src/contact-roles` (`ensureContactRole`, `declareRoleUsage`); **nunca** importa `modules/contacts` (sem ciclo)

## Convenções locais

- **O sujeito é contato ou fazenda** (`ReferralSubjectRef`: `kind` + `id`); `subjectColumn` escolhe `subject_contact_id` ou `subject_farm_id`, e o lock (`FOR UPDATE`) vai na tabela do sujeito. Importa `farms` só de `@crm/db`, nunca de `modules/farms`.
- **Sem rota própria.** A cadeia viaja aninhada no sujeito; quem grava é o módulo dele, na transação e no `auditedWrites` do save (`replaceReferralChain` recebe a mesma instância, senão o `change_id` quebra).
- **Grava pela diferença**, com a identidade do indicador (`referrerKey`): quem saiu é excluído, quem ficou muda de posição/nota mantendo o `id`, quem entrou é inserido. Inverter dois elos são dois `UPDATE` de posição, sem valor temporário (o histórico mostra "Posição: 1 → 2" e "2 → 1").
- Quem **entra** é checado (contato existente na empresa, sob o RLS; usuário com vínculo e sem `is_super_admin`); o que já estava gravado passa sem checagem. A regra de duplicado/ciclo é a de `@crm/shared`.
- Todo contato da cadeia ganha o papel Corretor externo (`ensureContactRole`, idempotente); esvaziar a cadeia não o retira.
- `readReferralChain` nunca seleciona `is_super_admin`.
- `contactReferralHistoryChild` e `farmReferralHistoryChild` declaram o elo como filho do histórico do contato e da fazenda; quem importa `routes.ts` (contatos e fazendas) carrega também a declaração de uso do papel; o `qualifier` (em `src/history`) põe "(posição N)" só no cadastro.
- `referralRefusal` (em `routes.ts`) traduz a recusa da regra e o CHECK/UNIQUE/FK do indicador de `referral_links` em 400 no campo `referralChain`; só dessa tabela.

## Filtro "Indicado por" (#189)

- `referredBy` (`referred-by.ts`) é a única condição do filtro `referrerContactId`/`referrerUserId` das listas de contatos e de fazendas. É sempre um `EXISTS` sobre `referral_links`, nunca `JOIN`: o registro que casa por dois elos ou dois indicadores entra uma vez e o `total` conta registros. Casa o indicador em qualquer posição; contatos e usuários escolhidos são OU entre si, e o filtro soma por E com os demais.
- O chamador passa o **tipo do sujeito** (`'contact'` ou `'farm'`), não a coluna: o par coluna do elo/id da lista fica no módulo, sem como errar. Não importa `modules/contacts` nem `modules/farms`. Spec: `docs/specs/fase-1-cadeia-de-indicacao.md`, issue #189.
- Não tem escopo próprio: o `farmScopeOf` (fazendas) e o `withoutDataScope` (contatos) são os da lista que a chama, então o Corretor `own` só conta as fazendas dele. Os índices `(tenant_id, referrer_contact_id)` e `(tenant_id, referrer_user_id)` da `0028` atendem o filtro.
