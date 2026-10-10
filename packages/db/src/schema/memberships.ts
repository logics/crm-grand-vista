import { sql } from 'drizzle-orm';
import { boolean, pgTable, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { id, timestamps } from './columns.js';
import { tenantId } from './tenant-scope.js';
import { users } from './users.js';

/**
 * Vínculo entre um usuário e uma empresa que ele acessa. Fora do RLS apesar do
 * `tenant_id`: é o vínculo que define a pertinência, e filtrá-lo por empresa
 * seria circular — o login quebraria.
 */
export const memberships = pgTable(
  'memberships',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tenantId: tenantId(),
    isDefault: boolean('is_default').notNull().default(false),
    ...timestamps,
  },
  (table) => [
    unique().on(table.userId, table.tenantId),
    // No máximo uma empresa padrão por usuário — garantia do banco, não da aplicação.
    uniqueIndex('memberships_user_id_default_unique').on(table.userId).where(sql`${table.isDefault}`),
  ],
);
