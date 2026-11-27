# referrals

Cadeia de indicação (`referral_links`): "o Pedro veio pelo João, que soube pelo Sebastião". Independente da comissão.

- **Spec:** `docs/specs/fase-1-cadeia-de-indicacao.md`; ADR 0005; issues #186 (contato) e #187 (fazenda).
- **Tabela que possui:** `referral_links`, completa para os dois sujeitos (contato e fazenda). As duas restrições de posição são `DEFERRABLE INITIALLY DEFERRED`, escritas à mão na migration `0028`.
- **Depende de:** `@crm/db`, `@crm/shared` (regra pura e schemas), `src/contact-roles` (`ensureContactRole`, `declareRoleUsage`); **nunca** importa `modules/contacts` (sem ciclo); de `modules/farms` só a folha `scope.ts` (`farmScopeOf`), em `referrer-usage.ts` (contagem visível do indicador para a mensagem de "em uso")

## Convenções locais

- **O sujeito é contato ou fazenda** (`ReferralSubjectRef`: `kind` + `id`); `subjectColumn` escolhe `subject_contact_id` ou `subject_farm_id`, e o lock (`FOR UPDATE`) vai na tabela do sujeito. Importa `farms` só de `@crm/db`, nunca de `modules/farms` (exceção: `farmScopeOf` de `farms/scope.ts`).
- **Sem rota própria.** A cadeia viaja aninhada no sujeito; quem grava é o módulo dele, na transação e no `auditedWrites` do save (`replaceReferralChain` recebe a mesma instância, senão o `change_id` quebra).
- **Grava pela diferença**, com a identidade do indicador (`referrerKey`): quem saiu é excluído, quem ficou muda de posição/nota mantendo o `id`, quem entrou é inserido. Inverter dois elos são dois `UPDATE` de posição, sem valor temporário (o histórico mostra "Posição: 1 → 2" e "2 → 1").
- Quem **entra** é checado (contato existente na empresa, sob o RLS; usuário com vínculo e sem `is_super_admin`); o que já estava gravado passa sem checagem. A regra de duplicado/ciclo é a de `@crm/shared`.
- Todo contato da cadeia ganha o papel Corretor externo (`ensureContactRole`, idempotente); esvaziar a cadeia não o retira.
- `readReferralChain` nunca seleciona `is_super_admin`.
- `contactReferralHistoryChild` e `farmReferralHistoryChild` declaram o elo como filho do histórico do contato e da fazenda; quem importa `routes.ts` (contatos e fazendas) carrega também a declaração de uso do papel; o `qualifier` (em `src/history`) põe "(posição N)" só no cadastro.
- `referralRefusal` (em `routes.ts`) traduz a recusa da regra e o CHECK/UNIQUE/FK do indicador de `referral_links` em 400 no campo `referralChain`; só dessa tabela.
