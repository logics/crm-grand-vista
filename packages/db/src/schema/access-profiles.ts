import { sql } from 'drizzle-orm';
import { boolean, check, pgTable, primaryKey, text, unique, uuid } from 'drizzle-orm/pg-core';
import { id, timestamps } from './columns.js';
import { permissions } from './permissions.js';
import { tenantId, tenantIsolationPolicy } from './tenant-scope.js';
import { users } from './users.js';

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

const profileId = () =>
  uuid('profile_id')
    .notNull()
    .references(() => accessProfiles.id, { onDelete: 'cascade' });

/** Permissões que um perfil de acesso concede. */
export const profilePermissions = pgTable(
  'profile_permissions',
  {
    tenantId: tenantId(),
    profileId: profileId(),
    permissionCode: text('permission_code')
      .notNull()
      .references(() => permissions.code, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (table) => [primaryKey({ columns: [table.profileId, table.permissionCode] }), tenantIsolationPolicy()],
);

/**
 * Escopo de dados de um perfil de acesso por módulo. `own` é ser o corretor
 * responsável pelo registro — não ter o perfil de acesso Corretor.
 */
export const profileDataScopes = pgTable(
  'profile_data_scopes',
  {
    tenantId: tenantId(),
    profileId: profileId(),
    module: text('module').notNull(),
    scope: text('scope').notNull(),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.profileId, table.module] }),
    check('profile_data_scopes_scope_check', sql`${table.scope} in ('own', 'all')`),
    tenantIsolationPolicy(),
  ],
);

/** Perfis de acesso vinculados a um usuário. Vale a união das permissões. */
export const userProfiles = pgTable(
  'user_profiles',
  {
    tenantId: tenantId(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    profileId: profileId(),
    ...timestamps,
  },
  (table) => [primaryKey({ columns: [table.userId, table.profileId] }), tenantIsolationPolicy()],
);
