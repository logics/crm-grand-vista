// Contatos da empresa ativa. Contato, papéis e auditoria vão numa transação só
// (a que a rota abre por `withTenant`), num `change_id` por save.
import {
  auditedWrites,
  contactRoles,
  contacts,
  type AuditActor,
  type Transaction,
} from '@crm/db';
import {
  CONTACT_ROLES,
  type Contact,
  type ContactListQuery,
  type ContactRole,
  type PersonType,
  hasLegalName,
  taxIdIssue,
  type CreateContactInput,
  type ListPage,
  type UpdateContactInput,
} from '@crm/shared';
import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import { defineList, paginatedQuery } from '../../listing/query.js';
import { withoutDataScope } from '../../authorization/data-scope.js';

type ContactRow = typeof contacts.$inferSelect;

/** Lista de contatos: nome na collation pt-BR, desempate por `id` (feito pelo helper). */
export const contactList = defineList({
  table: contacts,
  sortable: { name: sql`${contacts.name} collate "pt-BR-x-icu"`, createdAt: contacts.createdAt },
  defaultSort: 'name',
  searchable: [contacts.name, contacts.legalName, contacts.email],
});

const roleOrder = (roles: readonly string[]): ContactRole[] => CONTACT_ROLES.filter((role) => roles.includes(role));

function serialize(row: ContactRow, roles: readonly string[]): Contact {
  return {
    id: row.id,
    personType: row.personType as PersonType,
    name: row.name,
    legalName: row.legalName,
    taxId: row.taxId,
    email: row.email,
    relationshipOrigin: row.relationshipOrigin,
    strategicNotes: row.strategicNotes,
    roles: roleOrder(roles),
    createdAt: row.createdAt.toISOString(),
  };
}

async function rolesByContact(tx: Transaction, contactIds: readonly string[]): Promise<Map<string, string[]>> {
  const byContact = new Map<string, string[]>();
  if (contactIds.length === 0) return byContact;
  const rows = await tx
    .select({ contactId: contactRoles.contactId, role: contactRoles.role })
    .from(contactRoles)
    .where(inArray(contactRoles.contactId, [...contactIds]));
  for (const { contactId, role } of rows) byContact.set(contactId, [...(byContact.get(contactId) ?? []), role]);
  return byContact;
}

/** Existência do contato na empresa ativa (o RLS recorta); é o `isVisible` do histórico. */
export async function contactExists(tx: Transaction, id: string): Promise<boolean> {
  const [row] = await tx.select({ id: contacts.id }).from(contacts).where(eq(contacts.id, id));
  return row !== undefined;
}

export async function listContacts(tx: Transaction, query: ContactListQuery): Promise<ListPage<Contact>> {
  // Base compartilhada: sem cláusula de escopo de dados.
  const page = await paginatedQuery(tx, contactList, query, { scope: withoutDataScope });
  const roles = await rolesByContact(tx, page.items.map((item) => item.id));
  return { ...page, items: page.items.map((item) => serialize(item, roles.get(item.id) ?? [])) };
}

export async function getContact(tx: Transaction, id: string): Promise<Contact | null> {
  const [row] = await tx.select().from(contacts).where(eq(contacts.id, id));
  if (!row) return null;
  return serialize(row, (await rolesByContact(tx, [id])).get(id) ?? []);
}

/** Contato que já tem o documento: o que o formulário oferece abrir. */
export interface ExistingContact {
  id: string;
  name: string;
}

/** O documento já é de outro contato da empresa (409). */
export class TaxIdTakenError extends Error {
  constructor(readonly existing: ExistingContact) {
    super('Documento já cadastrado.');
    this.name = 'TaxIdTakenError';
  }
}

/** O documento não serve ao tipo de pessoa do cadastro (400 no campo). */
export class TaxIdMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaxIdMismatchError';
  }
}

/** Dono do documento na empresa ativa (o RLS recorta), exceto `exceptId`. */
export async function findContactByTaxId(
  tx: Transaction,
  taxId: string,
  exceptId?: string,
): Promise<ExistingContact | null> {
  const [row] = await tx
    .select({ id: contacts.id, name: contacts.name })
    .from(contacts)
    .where(and(eq(contacts.taxId, taxId), exceptId ? ne(contacts.id, exceptId) : undefined));
  return row ?? null;
}

async function assertTaxIdFree(tx: Transaction, taxId: string | null | undefined, exceptId?: string) {
  if (!taxId) return;
  const existing = await findContactByTaxId(tx, taxId, exceptId);
  if (existing) throw new TaxIdTakenError(existing);
}

/** Razão social só existe em PJ. */
const legalNameFor = (personType: PersonType, legalName: string | null | undefined) =>
  hasLegalName(personType) ? (legalName ?? null) : null;

export async function createContact(tx: Transaction, actor: AuditActor, input: CreateContactInput): Promise<Contact> {
  await assertTaxIdFree(tx, input.taxId);
  const writes = auditedWrites(tx, actor);
  const { roles, ...fields } = input;
  const row = await writes.insert(contacts, {
    ...fields,
    tenantId: actor.tenantId!,
    legalName: legalNameFor(fields.personType, fields.legalName),
  });
  for (const role of roles) await writes.insert(contactRoles, { tenantId: actor.tenantId!, contactId: row.id, role });
  return serialize(row, roles);
}

/** Altera o contato; `roles`, se presente, substitui o conjunto. Nulo se o contato não existe. */
export async function updateContact(
  tx: Transaction,
  actor: AuditActor,
  id: string,
  input: UpdateContactInput,
): Promise<Contact | null> {
  const current = await getContact(tx, id);
  if (!current) return null;

  const { roles, ...fields } = input;
  const personType = fields.personType ?? current.personType;
  // O schema só confere o par que veio junto; aqui o documento é conferido contra o cadastro.
  const mismatch = taxIdIssue(personType, fields.taxId === undefined ? current.taxId : fields.taxId);
  if (mismatch) throw new TaxIdMismatchError(mismatch);
  if (fields.taxId && fields.taxId !== current.taxId) await assertTaxIdFree(tx, fields.taxId, id);
  const writes = auditedWrites(tx, actor);
  const set: Partial<typeof contacts.$inferInsert> = { ...fields };
  // Passar para PF limpa a razão social; em PF ela não se grava.
  if (!hasLegalName(personType)) set.legalName = null;

  const [row] =
    Object.keys(set).length > 0
      ? await writes.update(contacts, set, eq(contacts.id, id))
      : await tx.select().from(contacts).where(eq(contacts.id, id));
  if (!row) return null;

  let finalRoles: readonly string[] = current.roles;
  if (roles) {
    const removed = current.roles.filter((role) => !roles.includes(role));
    const added = roles.filter((role) => !current.roles.includes(role));
    if (removed.length > 0) {
      await writes.delete(contactRoles, and(eq(contactRoles.contactId, id), inArray(contactRoles.role, removed))!);
    }
    for (const role of added) await writes.insert(contactRoles, { tenantId: actor.tenantId!, contactId: id, role });
    finalRoles = roles;
  }

  return serialize(row, finalRoles);
}
