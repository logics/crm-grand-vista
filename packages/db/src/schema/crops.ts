import { pgTable } from 'drizzle-orm/pg-core';
import { tenantIsolationPolicy } from './tenant-scope.js';
import { uniqueVocabularyName, vocabularyColumns } from './vocabulary.js';

/** Cultura plantada ou criada na fazenda: cadastro auxiliar de ordem alfabética. */
export const crops = pgTable('crops', vocabularyColumns(), (table) => [
  uniqueVocabularyName('crops', table),
  tenantIsolationPolicy(),
]);
