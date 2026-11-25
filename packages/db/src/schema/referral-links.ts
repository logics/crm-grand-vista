import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core';
import { id, timestamps } from './columns.js';
import { contacts } from './contacts.js';
import { farms } from './farms.js';
import { tenantId, tenantIsolationPolicy } from './tenant-scope.js';
import { users } from './users.js';

/**
 * Elo da cadeia de indicação ("o Pedro veio pelo João, que soube pelo
 * Sebastião"), de um contato ou de uma fazenda. Independente da comissão.
 * Exatamente um sujeito e exatamente um indicador (corretor interno ou
 * contato); a posição (1 = quem trouxe direto) é única por sujeito e vai de
 * 1 a 10.
 *
 * As duas restrições de posição são `DEFERRABLE INITIALLY DEFERRED`, para que
 * a troca de dois elos passe dentro de uma transação (a unicidade só é
 * conferida no `COMMIT`). O Drizzle não gera `DEFERRABLE`: a migration
 * `0028_referral_links.sql` o acrescenta à mão, e o teste de `pg_constraint`
 * guarda contra uma regeneração que o perca. Por isso também não podem virar
 * índice parcial.
 */
export const referralLinks = pgTable(
  'referral_links',
  {
    id: id(),
    tenantId: tenantId(),
    subjectContactId: uuid('subject_contact_id').references(() => contacts.id, { onDelete: 'cascade' }),
    subjectFarmId: uuid('subject_farm_id').references(() => farms.id, { onDelete: 'cascade' }),
    referrerUserId: uuid('referrer_user_id').references(() => users.id, { onDelete: 'restrict' }),
    referrerContactId: uuid('referrer_contact_id').references(() => contacts.id, { onDelete: 'restrict' }),
    position: integer('position').notNull(),
    notes: text('notes'),
    ...timestamps,
  },
  (t) => [
    check('referral_links_one_subject_check', sql`num_nonnulls(${t.subjectContactId}, ${t.subjectFarmId}) = 1`),
    check('referral_links_one_referrer_check', sql`num_nonnulls(${t.referrerUserId}, ${t.referrerContactId}) = 1`),
    check('referral_links_position_check', sql`${t.position} between 1 and 10`),
    check('referral_links_notes_check', sql`char_length(${t.notes}) <= 500`),
    // O contato não entra na própria cadeia. Cada lado nulo passa de propósito: fazenda
    // indicada por usuário tem os dois nulos, e `IS DISTINCT FROM` os trataria como iguais.
    check(
      'referral_links_not_self_check',
      sql`${t.subjectContactId} is null or ${t.referrerContactId} is null or ${t.subjectContactId} <> ${t.referrerContactId}`,
    ),
    unique('referral_links_subject_contact_position_unique').on(t.tenantId, t.subjectContactId, t.position),
    unique('referral_links_subject_farm_position_unique').on(t.tenantId, t.subjectFarmId, t.position),
    unique('referral_links_subject_contact_id_referrer_contact_id_unique').on(t.subjectContactId, t.referrerContactId),
    unique('referral_links_subject_contact_id_referrer_user_id_unique').on(t.subjectContactId, t.referrerUserId),
    unique('referral_links_subject_farm_id_referrer_contact_id_unique').on(t.subjectFarmId, t.referrerContactId),
    unique('referral_links_subject_farm_id_referrer_user_id_unique').on(t.subjectFarmId, t.referrerUserId),
    index('referral_links_tenant_id_referrer_contact_id_idx').on(t.tenantId, t.referrerContactId),
    index('referral_links_tenant_id_referrer_user_id_idx').on(t.tenantId, t.referrerUserId),
    tenantIsolationPolicy(),
  ],
);
