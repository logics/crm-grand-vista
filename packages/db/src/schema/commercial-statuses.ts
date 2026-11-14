import { sql } from 'drizzle-orm';
import { check, pgTable, text } from 'drizzle-orm/pg-core';
import { tenantIsolationPolicy } from './tenant-scope.js';
import { uniqueVocabularyName, vocabularyColumns } from './vocabulary.js';

/**
 * Status comercial da fazenda: cadastro auxiliar de ordem manual e com
 * significado de sistema (o que o código lê; o nome é livre).
 */
export const commercialStatuses = pgTable(
  'commercial_statuses',
  { ...vocabularyColumns(), systemMeaning: text('system_meaning').notNull() },
  (table) => [
    uniqueVocabularyName('commercial_statuses', table),
    check(
      'commercial_statuses_system_meaning_check',
      sql`${table.systemMeaning} in ('available', 'negotiating', 'sold', 'suspended', 'inactive')`,
    ),
    tenantIsolationPolicy(),
  ],
);
