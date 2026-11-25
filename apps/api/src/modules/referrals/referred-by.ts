// Filtro "Indicado por" das listas de contatos e de fazendas (spec
// fase-1-cadeia-de-indicacao, Regras → Filtro "Indicado por"). Uma condição só,
// usada pelas duas listas como mais um filtro do `paginatedQuery`.
import { contacts, farms, referralLinks } from '@crm/db';
import { inArray, or, sql, type SQL } from 'drizzle-orm';
import type { ReferralSubjectRef } from './service.js';

/** Por tipo de sujeito: a coluna do elo e o id da linha da lista que ela aponta. */
const SUBJECT_COLUMNS = {
  contact: { link: referralLinks.subjectContactId, row: contacts.id },
  farm: { link: referralLinks.subjectFarmId, row: farms.id },
} as const;

/**
 * Registros indicados por qualquer um dos indicadores escolhidos, em qualquer
 * posição da cadeia: OU entre os contatos e os usuários. Sem nenhum id, não há
 * condição (`undefined`).
 *
 * Sempre `EXISTS`, nunca `JOIN`: a cadeia tem um elo por posição, e um `JOIN`
 * repetiria o registro que casa por mais de um indicador (ou por dois elos),
 * inflando `items` e `total`. Com `EXISTS` o registro entra uma vez e o `total`
 * conta registros. O escopo de dados continua o da lista que chama; esta
 * condição não o substitui nem o afrouxa.
 *
 * O chamador passa o tipo do sujeito, e não uma coluna, para que o par
 * coluna do elo/id da lista não possa ser trocado.
 */
export function referredBy(
  { contactIds, userIds }: { contactIds?: readonly string[]; userIds?: readonly string[] },
  subject: ReferralSubjectRef['kind'],
): SQL | undefined {
  const referrer = or(
    contactIds?.length ? inArray(referralLinks.referrerContactId, [...contactIds]) : undefined,
    userIds?.length ? inArray(referralLinks.referrerUserId, [...userIds]) : undefined,
  );
  if (!referrer) return undefined;
  const { link, row } = SUBJECT_COLUMNS[subject];
  return sql`exists (select 1 from ${referralLinks} where ${link} = ${row} and ${referrer})`;
}
