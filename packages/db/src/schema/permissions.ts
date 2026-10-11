import { sql } from 'drizzle-orm';
import { check, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { timestamps } from './columns.js';
import { users } from './users.js';

/**
 * Catálogo global de permissões (`fazendas.criar`), definido em código e
 * sincronizado por migration. Fora do RLS: não pertence a empresa nenhuma.
 */
export const permissions = pgTable(
  'permissions',
  {
    code: text('code').primaryKey(),
    module: text('module').notNull(),
    action: text('action').notNull(),
    scope: text('scope').notNull(),
    description: text('description').notNull(),
    ...timestamps,
  },
  (table) => [check('permissions_scope_check', sql`${table.scope} in ('tenant', 'platform')`)],
);

/**
 * Permissões de escopo de plataforma concedidas a um usuário. Vazia na Fase 0:
 * é a estrutura que o AdminMaster usará quando existir.
 */
export const userPlatformPermissions = pgTable(
  'user_platform_permissions',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    permissionCode: text('permission_code')
      .notNull()
      .references(() => permissions.code, { onDelete: 'cascade' }),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
    grantedBy: uuid('granted_by').references(() => users.id),
    ...timestamps,
  },
  (table) => [primaryKey({ columns: [table.userId, table.permissionCode] })],
);
