import { sql } from 'drizzle-orm';
import { check, index, jsonb, pgTable, text, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { id, timestamps } from './columns.js';
import { contactClassifications } from './contact-classifications.js';
import { leadSources } from './lead-sources.js';
import { tenantId, tenantIsolationPolicy } from './tenant-scope.js';

/**
 * Contato: pessoa física ou jurídica com quem a corretora se relaciona. Base
 * compartilhada — não há corretor responsável nem escopo de dados. Os papéis
 * ficam em `contact_roles`.
 */
export const contacts = pgTable(
  'contacts',
  {
    id: id(),
    tenantId: tenantId(),
    personType: text('person_type').notNull(),
    /** Em PJ, o nome fantasia. */
    name: text('name').notNull(),
    legalName: text('legal_name'),
    /** Documento normalizado (sem pontuação, maiúsculas); único por empresa quando presente. */
    taxId: text('tax_id'),
    email: text('email'),
    phone: text('phone'),
    whatsapp: text('whatsapp'),
    classificationId: uuid('classification_id').references(() => contactClassifications.id, { onDelete: 'restrict' }),
    leadSourceId: uuid('lead_source_id').references(() => leadSources.id, { onDelete: 'restrict' }),
    relationshipOrigin: text('relationship_origin'),
    strategicNotes: text('strategic_notes'),
    /** Sem uso até `fase-1-campos-personalizados`. */
    customFields: jsonb('custom_fields').notNull().default({}),
    ...timestamps,
  },
  (table) => [
    check('contacts_person_type_check', sql`${table.personType} in ('pf', 'pj')`),
    uniqueIndex('contacts_tenant_id_tax_id_unique').on(table.tenantId, table.taxId).where(sql`${table.taxId} is not null`),
    index('contacts_tenant_id_name_idx').on(table.tenantId, sql`${table.name} collate "pt-BR-x-icu"`),
    tenantIsolationPolicy(),
  ],
);

/** Papel do contato (comprador, proprietário, corretor externo): junção auditável. */
export const contactRoles = pgTable(
  'contact_roles',
  {
    id: id(),
    tenantId: tenantId(),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    ...timestamps,
  },
  (table) => [
    check('contact_roles_role_check', sql`${table.role} in ('buyer', 'owner', 'external_broker')`),
    unique('contact_roles_contact_id_role_unique').on(table.contactId, table.role),
    tenantIsolationPolicy(),
  ],
);
