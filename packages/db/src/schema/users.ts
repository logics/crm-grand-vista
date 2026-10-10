import { boolean, pgTable, text } from 'drizzle-orm/pg-core';
import { id, timestamps } from './columns.js';

/**
 * Usuário, na forma do Better Auth. Fora do RLS: o login o consulta antes de
 * haver empresa ativa. `is_super_admin` é marcada só por CLI e removida de toda
 * serialização.
 */
export const users = pgTable('users', {
  id: id(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  isSuperAdmin: boolean('is_super_admin').notNull().default(false),
  ...timestamps,
});
