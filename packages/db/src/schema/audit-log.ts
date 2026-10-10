import { bigint, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenantIsolationPolicy } from './tenant-scope.js';
import { tenants } from './tenants.js';
import { users } from './users.js';

/**
 * Auditoria — uma linha por campo alterado. Append-only para a aplicação:
 * `crm_app` recebe só INSERT e SELECT na migration. Valores em `text` para
 * caber qualquer tipo; rótulo e formatação vêm dos metadados de campo.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    // `bigint` identity, e não UUIDv7: alto volume, e nunca aparece em URL.
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    // Nulo para ação de plataforma — por isso não é o `tenantId()` das demais.
    tenantId: uuid('tenant_id').references(() => tenants.id),
    entity: text('entity').notNull(),
    entityId: text('entity_id').notNull(),
    field: text('field').notNull(),
    oldValue: text('old_value'),
    newValue: text('new_value'),
    // Nulo para ação de CLI ou de sistema: nulo é a verdade.
    userId: uuid('user_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index().on(table.tenantId, table.entity, table.entityId, table.createdAt.desc()),
    index().on(table.tenantId, table.createdAt.desc()),
    tenantIsolationPolicy(),
  ],
);
