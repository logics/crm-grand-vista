import { boolean, pgTable, text, unique } from 'drizzle-orm/pg-core';
import { id, timestamps } from './columns.js';
import { tenantId, tenantIsolationPolicy } from './tenant-scope.js';

/** Perfil de acesso — pacote de permissões que cada empresa compõe. */
export const accessProfiles = pgTable(
  'access_profiles',
  {
    id: id(),
    tenantId: tenantId(),
    name: text('name').notNull(),
    description: text('description'),
    isSeeded: boolean('is_seeded').notNull().default(false),
    ...timestamps,
  },
  (table) => [unique().on(table.tenantId, table.name), tenantIsolationPolicy()],
);
