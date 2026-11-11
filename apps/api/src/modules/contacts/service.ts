// Contatos da empresa ativa. Contato, papéis e auditoria vão numa transação só
// (a que a rota abre por `withTenant`), num `change_id` por save.
import {
  auditLog,
  auditedWrites,
  contactClassifications,
  contactRoles,
  contacts,
  diffRecords,
  leadSources,
  uuidv7,
  type AuditActor,
  type Transaction,
} from '@crm/db';
import {
  BUSINESS_TIME_ZONE,
  CONTACT_CLASSIFICATION_REQUIRES_BUYER_MESSAGE,
  CONTACT_CLASSIFICATION_UNKNOWN_MESSAGE,
  CONTACT_LEAD_SOURCE_UNKNOWN_MESSAGE,
  CONTACT_ROLE_LABELS,
  CONTACT_ROLES,
  FIELD_REGISTRY,
  type Contact,
  type ContactDuplicate,
  type ContactDuplicatesQuery,
  type ContactListQuery,
  type DuplicateReason,
  type ContactRole,
  type PersonType,
  hasClassification,
  hasLegalName,
  normalizePhone,
  normalizeTaxId,
  taxIdIssue,
  type CreateContactInput,
  type ListPage,
  type UpdateContactInput,
} from '@crm/shared';
import { and, eq, getTableColumns, getTableName, inArray, ne, or, sql, type SQL } from 'drizzle-orm';
import { countRoleUsage, pluralLabelOfTable } from './role-usage.js';
import { defineList, escapeLike, paginatedQuery } from '../../listing/query.js';
import { withoutDataScope } from '../../authorization/data-scope.js';

type ContactRow = typeof contacts.$inferSelect;

/** Lista de contatos: nome na collation pt-BR, desempate por `id` (feito pelo helper). */
export const contactList = defineList({
  table: contacts,
  sortable: { name: sql`${contacts.name} collate "pt-BR-x-icu"`, createdAt: contacts.createdAt },
  defaultSort: 'name',
  searchable: [contacts.name, contacts.legalName, contacts.taxId, contacts.email],
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
    phone: row.phone,
    whatsapp: row.whatsapp,
    relationshipOrigin: row.relationshipOrigin,
    strategicNotes: row.strategicNotes,
    classificationId: row.classificationId,
    leadSourceId: row.leadSourceId,
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

const registeredDay = sql`(${contacts.createdAt} at time zone ${BUSINESS_TIME_ZONE})::date`;

/** Só dígitos e a pontuação de telefone: "(64) 99999-1234", "+55 64 99999 1234". Letra faz o termo ser texto ("Fazenda 2"). */
const PHONE_TERM = /^[\d\s()+.\-/]+$/;

const onlyDigits = (text: string) => text.replace(/\D/g, '');

/**
 * Além das colunas de texto de `contactList`, `q` acha o documento pelo termo
 * normalizado ("529.982.247-25" acha "52998224725") e telefone/WhatsApp pelos
 * dígitos, com ou sem DDI. Termo com letra não vira busca de telefone.
 */
function searchByNormalizedTerms(q: string | undefined): (SQL | undefined)[] {
  if (q === undefined) return [];
  const clauses: (SQL | undefined)[] = [];
  const taxId = normalizeTaxId(q);
  if (taxId) clauses.push(sql`${contacts.taxId} like ${`%${escapeLike(taxId)}%`}`);
  const digits = PHONE_TERM.test(q) ? onlyDigits(q) : '';
  if (digits) {
    const pattern = `%${digits}%`;
    clauses.push(
      sql`regexp_replace(${contacts.phone}, '\\D', '', 'g') like ${pattern}`,
      sql`regexp_replace(${contacts.whatsapp}, '\\D', '', 'g') like ${pattern}`,
    );
  }
  return clauses;
}

function contactFilters(query: ContactListQuery): (SQL | undefined)[] {
  const { role, personType, classificationId, leadSourceId, createdFrom, createdTo } = query;
  return [
    role
      ? sql`exists (select 1 from ${contactRoles} where ${contactRoles.contactId} = ${contacts.id} and ${inArray(contactRoles.role, role)})`
      : undefined,
    personType ? eq(contacts.personType, personType) : undefined,
    classificationId ? eq(contacts.classificationId, classificationId) : undefined,
    leadSourceId ? eq(contacts.leadSourceId, leadSourceId) : undefined,
    createdFrom ? sql`${registeredDay} >= ${createdFrom}::date` : undefined,
    createdTo ? sql`${registeredDay} <= ${createdTo}::date` : undefined,
  ];
}

export async function listContacts(tx: Transaction, query: ContactListQuery): Promise<ListPage<Contact>> {
  // Base compartilhada: sem cláusula de escopo de dados.
  const page = await paginatedQuery(tx, contactList, query, {
    scope: withoutDataScope,
    filters: contactFilters(query),
    searchAlso: searchByNormalizedTerms(query.q),
  });
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

/** Recusa de regra de negócio (400), com a mensagem pronta para exibir. */
export interface ContactRejection {
  rejected: string;
}

export const isRejection = (result: unknown): result is ContactRejection =>
  typeof result === 'object' && result !== null && 'rejected' in result;

/** A classificação e a origem apontam para entradas da empresa ativa (o RLS recorta a consulta). */
async function referencesMissing(
  tx: Transaction,
  { classificationId, leadSourceId }: { classificationId?: string | null; leadSourceId?: string | null },
): Promise<string | null> {
  if (classificationId) {
    const [row] = await tx
      .select({ id: contactClassifications.id })
      .from(contactClassifications)
      .where(eq(contactClassifications.id, classificationId));
    if (!row) return CONTACT_CLASSIFICATION_UNKNOWN_MESSAGE;
  }
  if (leadSourceId) {
    const [row] = await tx.select({ id: leadSources.id }).from(leadSources).where(eq(leadSources.id, leadSourceId));
    if (!row) return CONTACT_LEAD_SOURCE_UNKNOWN_MESSAGE;
  }
  return null;
}

export async function createContact(
  tx: Transaction,
  actor: AuditActor,
  input: CreateContactInput,
): Promise<Contact | ContactRejection> {
  const missing = await referencesMissing(tx, input);
  if (missing) return { rejected: missing };
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

/**
 * Altera o contato; `roles`, se presente, substitui o conjunto. Nulo se o contato
 * não existe. Sem o papel comprador a classificação não existe: informá-la é
 * recusa, e retirar o papel a apaga no mesmo save (o histórico guarda o valor anterior).
 */
export async function updateContact(
  tx: Transaction,
  actor: AuditActor,
  id: string,
  input: UpdateContactInput,
): Promise<Contact | ContactRejection | null> {
  const current = await getContact(tx, id);
  if (!current) return null;

  const isBuyer = hasClassification(input.roles ?? current.roles);
  if (input.classificationId && !isBuyer) return { rejected: CONTACT_CLASSIFICATION_REQUIRES_BUYER_MESSAGE };
  const missing = await referencesMissing(tx, input);
  if (missing) return { rejected: missing };

  const { roles, ...fields } = input;
  const personType = fields.personType ?? current.personType;
  // O schema só confere o par que veio junto; aqui o documento é conferido contra o cadastro.
  const mismatch = taxIdIssue(personType, fields.taxId === undefined ? current.taxId : fields.taxId);
  if (mismatch) throw new TaxIdMismatchError(mismatch);
  if (fields.taxId && fields.taxId !== current.taxId) await assertTaxIdFree(tx, fields.taxId, id);
  if (roles) await assertRolesNotInUse(tx, current, current.roles.filter((role) => !roles.includes(role)));
  const writes = auditedWrites(tx, actor);
  const set: Partial<typeof contacts.$inferInsert> = { ...fields };
  // Passar para PF limpa a razão social; em PF ela não se grava.
  if (!hasLegalName(personType)) set.legalName = null;
  if (!isBuyer && current.classificationId) set.classificationId = null;

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

/** Nome para comparar: sem caixa nem acento. */
const foldedName = (column: SQL | typeof contacts.name) => sql`lower(unaccent(${column}))`;

/**
 * Contatos que coincidem com o que está sendo cadastrado: telefone e WhatsApp
 * (comparados entre si, em qualquer combinação), e-mail e nome igual sem caixa
 * nem acento. Cada um vem com os motivos. É aviso, não bloqueio. `excludeId`
 * tira o próprio contato (edição). Critério vazio ou telefone inválido não conta.
 */
export async function findDuplicates(tx: Transaction, query: ContactDuplicatesQuery): Promise<ContactDuplicate[]> {
  const phone = query.phone ? normalizePhone(query.phone) : null;
  const whatsapp = query.whatsapp ? normalizePhone(query.whatsapp) : null;
  const email = query.email?.toLowerCase() || null;
  const name = query.name || null;

  const matchers: Record<DuplicateReason, SQL | null> = {
    phone: phone ? or(eq(contacts.phone, phone), eq(contacts.whatsapp, phone))! : null,
    whatsapp: whatsapp ? or(eq(contacts.phone, whatsapp), eq(contacts.whatsapp, whatsapp))! : null,
    email: email ? sql`lower(${contacts.email}) = ${email}` : null,
    name: name ? sql`${foldedName(contacts.name)} = ${foldedName(sql`${name}`)}` : null,
  };
  const reasons = (Object.keys(matchers) as DuplicateReason[]).filter((reason) => matchers[reason]);
  if (reasons.length === 0) return [];

  const rows = await tx
    .select({
      id: contacts.id,
      name: contacts.name,
      ...Object.fromEntries(reasons.map((reason) => [reason, sql<boolean>`coalesce(${matchers[reason]}, false)`])),
    })
    .from(contacts)
    .where(and(or(...reasons.map((reason) => matchers[reason]!)), query.excludeId ? ne(contacts.id, query.excludeId) : undefined))
    .orderBy(sql`${contacts.name} collate "pt-BR-x-icu"`, contacts.id)
    .limit(20);

  const roles = await rolesByContact(tx, rows.map((row) => row.id));
  return rows.map((row) => {
    const flags = row as unknown as Record<DuplicateReason, boolean>;
    return {
      id: row.id,
      name: row.name,
      roles: roleOrder(roles.get(row.id) ?? []),
      reasons: reasons.filter((reason) => flags[reason]),
    };
  });
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
  // `ON CONFLICT DO NOTHING` no unique (contact_id, role): chamadas simultâneas não
  // estouram 23505; quem perde a corrida não recebe linha e devolve falso.
  const [row] = await tx
    .insert(contactRoles)
    .values({ tenantId: actor.tenantId!, contactId, role })
    .onConflictDoNothing({ target: [contactRoles.contactId, contactRoles.role] })
    .returning();
  if (!row) return false;

  // Mesma auditoria de `auditedWrites.insert` (um campo por linha, valor anterior nulo,
  // um `change_id` por chamada); o insert acima não passa pelo wrapper por causa do ON CONFLICT.
  const after: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(getTableColumns(contactRoles))) {
    after[column.name] = row[key as keyof typeof row];
  }
  const changeId = uuidv7();
  const changes = diffRecords(null, after);
  await tx.insert(auditLog).values(
    changes.map((change) => ({
      tenantId: actor.tenantId,
      entity: getTableName(contactRoles),
      entityId: row.id,
      changeId,
      field: change.field,
      oldValue: change.oldValue,
      newValue: change.newValue,
      userId: actor.userId,
    })),
  );
  return true;
}
