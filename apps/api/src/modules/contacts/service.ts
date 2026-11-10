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
  CONTACT_ROLE_LABELS,
  CONTACT_ROLES,
  FIELD_REGISTRY,
  type Contact,
  type ContactListQuery,
  type ContactRole,
  type PersonType,
  hasLegalName,
  type CreateContactInput,
  type ListPage,
  type UpdateContactInput,
} from '@crm/shared';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { countRoleUsage, pluralLabelOfTable } from './role-usage.js';
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

/** Retirar papel em uso: a mensagem já diz onde, para o front exibi-la. */
export class RoleInUseError extends Error {}

const countedLabel = (count: number, label: { singular: string; plural: string }) =>
  `${count} ${count === 1 ? label.singular : label.plural}`;

/** Recusa a retirada de papel que alguma declaração de uso ainda referencia. */
async function assertRolesNotInUse(tx: Transaction, contact: Contact, removed: readonly ContactRole[]) {
  for (const role of removed) {
    const uses = await countRoleUsage(tx, role, contact.id);
    if (uses.length === 0) continue;
    const roleLabel = CONTACT_ROLE_LABELS[role].toLowerCase();
    const where = uses.map(({ usage, count }) => countedLabel(count, usage.label)).join(' e ');
    throw new RoleInUseError(
      `${contact.name} é ${roleLabel} de ${where}; troque o ${roleLabel} antes de retirar o papel.`,
    );
  }
}

/** Razão social só existe em PJ. */
const legalNameFor = (personType: PersonType, legalName: string | null | undefined) =>
  hasLegalName(personType) ? (legalName ?? null) : null;

export async function createContact(tx: Transaction, actor: AuditActor, input: CreateContactInput): Promise<Contact> {
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

  const nextRoles = input.roles;
  if (nextRoles) await assertRolesNotInUse(tx, current, current.roles.filter((role) => !nextRoles.includes(role)));

  const writes = auditedWrites(tx, actor);
  const { roles, ...fields } = input;
  const personType = fields.personType ?? current.personType;
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

/** Rótulo (plural, capitalizado) da entidade que referencia o contato pela tabela, pelas declarações ou pelos metadados de campo. */
function referencingEntityLabel(table: string | undefined): string {
  if (!table) return 'outros cadastros';
  const declared = pluralLabelOfTable(table);
  const registered = (FIELD_REGISTRY as Record<string, { label: string }>)[table]?.label;
  const label = declared ?? registered ?? table;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export const contactInUseMessage = (table: string | undefined) =>
  `Este contato está em uso em ${referencingEntityLabel(table)}. Remova os vínculos antes de excluir.`;

/**
 * Exclui o contato e os papéis (auditados). Falso se não existe. A FK `RESTRICT`
 * de quem consome o contato faz o banco recusar: o erro sobe para a rota traduzir.
 */
export async function deleteContact(tx: Transaction, actor: AuditActor, id: string): Promise<boolean> {
  if (!(await contactExists(tx, id))) return false;
  const writes = auditedWrites(tx, actor);
  await writes.delete(contactRoles, eq(contactRoles.contactId, id));
  await writes.delete(contacts, eq(contacts.id, id));
  return true;
}

/** Garantir papel: acrescenta se faltar, na transação de quem chama. Verdadeiro se acrescentou. */
export async function ensureContactRole(
  tx: Transaction,
  actor: AuditActor,
  contactId: string,
  role: ContactRole,
): Promise<boolean> {
  const [existing] = await tx
    .select({ id: contactRoles.id })
    .from(contactRoles)
    .where(and(eq(contactRoles.contactId, contactId), eq(contactRoles.role, role)));
  if (existing) return false;
  await auditedWrites(tx, actor).insert(contactRoles, { tenantId: actor.tenantId!, contactId, role });
  return true;
}
