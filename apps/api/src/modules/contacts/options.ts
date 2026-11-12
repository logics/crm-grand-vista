// Opções do seletor de contato (`GET /contacts/options`). O papel pedido
// ordena, não filtra: quem o tem vem primeiro, depois os demais, cada grupo por
// nome. Fica fora de `service.ts` para o seletor evoluir sem tocar a lista.
import { contactRoles, contacts, normalizedText, type Transaction } from '@crm/db';
import {
  CONTACT_ROLES,
  normalizeTaxId,
  type ContactOption,
  type ContactOptionsPage,
  type ContactOptionsQuery,
  type ContactRole,
  type PersonType,
} from '@crm/shared';
import { and, asc, eq, exists, inArray, or, sql, type SQL } from 'drizzle-orm';
import { escapeLike } from '../../listing/query.js';

const byName = sql`${contacts.name} collate "pt-BR-x-icu"`;

const OPTION_COLUMNS = {
  id: contacts.id,
  name: contacts.name,
  personType: contacts.personType,
  taxId: contacts.taxId,
};

async function rolesOf(tx: Transaction, ids: readonly string[]): Promise<Map<string, ContactRole[]>> {
  const byContact = new Map<string, ContactRole[]>();
  if (ids.length === 0) return byContact;
  const rows = await tx
    .select({ contactId: contactRoles.contactId, role: contactRoles.role })
    .from(contactRoles)
    .where(inArray(contactRoles.contactId, [...ids]));
  for (const { contactId, role } of rows) byContact.set(contactId, [...(byContact.get(contactId) ?? []), role as ContactRole]);
  for (const [id, roles] of byContact) byContact.set(id, CONTACT_ROLES.filter((role) => roles.includes(role)));
  return byContact;
}

/** Termo em nome, razão social, e-mail, documento (normalizado) e telefone/WhatsApp pelos dígitos. */
function searchClause(term: string): SQL {
  const pattern = `%${escapeLike(term)}%`;
  const clauses: SQL[] = [
    sql`${normalizedText(contacts.name)} like ${normalizedText(pattern)}`,
    sql`${normalizedText(contacts.legalName)} like ${normalizedText(pattern)}`,
    sql`${normalizedText(contacts.email)} like ${normalizedText(pattern)}`,
  ];
  if (/\d/.test(term)) {
    const taxId = normalizeTaxId(term);
    if (taxId.length >= 3) clauses.push(sql`${contacts.taxId} like ${`%${taxId}%`}`);
    const digits = term.replace(/\D/g, '');
    if (digits.length >= 3) {
      clauses.push(sql`${contacts.phone} like ${`%${digits}%`}`, sql`${contacts.whatsapp} like ${`%${digits}%`}`);
    }
  }
  return or(...clauses)!;
}

/** Hidratação sem `contatos.ver`: só id e nome atravessam. */
export async function hydrateContactNames(tx: Transaction, ids: readonly string[]): Promise<ContactOptionsPage> {
  if (ids.length === 0) return { items: [] };
  const rows = await tx.select({ id: contacts.id, name: contacts.name }).from(contacts).where(inArray(contacts.id, [...ids])).orderBy(byName, asc(contacts.id));
  return { items: rows.map((row) => ({ ...row, personType: null, taxId: null, roles: [] })) };
}

/**
 * Opções do seletor. `ids` hidrata os contatos gravados e ignora busca e papel.
 * Paginação por posição (cursor = deslocamento): a ordem é total (termina em
 * `id`), então nada repete nem se perde.
 */
export async function listContactOptions(tx: Transaction, query: ContactOptionsQuery): Promise<ContactOptionsPage> {
  const serialize = async (rows: { id: string; name: string; personType: string; taxId: string | null }[]): Promise<ContactOption[]> => {
    const roles = await rolesOf(tx, rows.map((row) => row.id));
    return rows.map((row) => ({ ...row, personType: row.personType as PersonType, roles: roles.get(row.id) ?? [] }));
  };

  if (query.ids.length > 0) {
    const rows = await tx.select(OPTION_COLUMNS).from(contacts).where(inArray(contacts.id, query.ids)).orderBy(byName, asc(contacts.id));
    return { items: await serialize(rows) };
  }

  const offset = query.cursor === undefined ? 0 : Number(query.cursor);
  const hasRole = query.role
    ? exists(tx.select({ one: sql`1` }).from(contactRoles).where(and(eq(contactRoles.contactId, contacts.id), eq(contactRoles.role, query.role))))
    : undefined;
  const rows = await tx
    .select(OPTION_COLUMNS)
    .from(contacts)
    .where(query.q ? searchClause(query.q) : undefined)
    .orderBy(...(hasRole ? [sql`(case when ${hasRole} then 0 else 1 end)`] : []), byName, asc(contacts.id))
    .limit(query.limit + 1)
    .offset(offset);

  const items = await serialize(rows.slice(0, query.limit));
  return rows.length > query.limit ? { items, nextCursor: String(offset + query.limit) } : { items };
}
