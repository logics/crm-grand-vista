# referrals

Cadeia de indicação (`referral_links`): "o Pedro veio pelo João, que soube pelo Sebastião". Independente da comissão.

- **Spec:** `docs/specs/fase-1-cadeia-de-indicacao.md`; ADR 0005; issue #186 (contato). A fazenda usa a mesma tabela na #187.
- **Tabela que possui:** `referral_links`, completa para os dois sujeitos (contato e fazenda). As duas restrições de posição são `DEFERRABLE INITIALLY DEFERRED`, escritas à mão na migration `0028`.
- **Depende de:** `@crm/db`, `@crm/shared` (regra pura e schemas), `modules/contacts` (`ensureContactRole`, `declareRoleUsage`)

## Convenções locais

- **Sem rota própria.** A cadeia viaja aninhada no sujeito; quem grava é o módulo dele, na transação e no `auditedWrites` do save (`replaceReferralChain` recebe a mesma instância, senão o `change_id` quebra).
- **Grava pela diferença**, com a identidade do indicador (`referrerKey`): quem saiu é excluído, quem ficou muda de posição/nota mantendo o `id`, quem entrou é inserido. Inverter dois elos são dois `UPDATE` de posição, sem valor temporário (o histórico mostra "Posição: 1 → 2" e "2 → 1").
- Quem **entra** é checado (contato existente na empresa, sob o RLS; usuário com vínculo e sem `is_super_admin`); o que já estava gravado passa sem checagem. A regra de duplicado/ciclo é a de `@crm/shared`.
- Todo contato da cadeia ganha o papel Corretor externo (`ensureContactRole`, idempotente); esvaziar a cadeia não o retira.
- `readReferralChain` nunca seleciona `is_super_admin`.
- `contactReferralHistoryChild` declara o elo como filho do histórico do contato; o `qualifier` (em `src/history`) põe "(posição N)" só no cadastro.
