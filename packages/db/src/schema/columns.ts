// Colunas das convenções transversais de `docs/specs/modelo-de-dados.md`,
// declaradas uma vez e reusadas por toda tabela.
import { timestamp, uuid } from 'drizzle-orm/pg-core';
import { uuidv7 } from '../uuid.js';

/** Chave primária UUIDv7, gerada na aplicação. */
export const id = () => uuid('id').primaryKey().$defaultFn(() => uuidv7());

/** `created_at` e `updated_at`, sempre `timestamptz` em UTC. */
export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};
