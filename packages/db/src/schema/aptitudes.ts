import { pgTable } from 'drizzle-orm/pg-core';
import { tenantIsolationPolicy } from './tenant-scope.js';
import { uniqueVocabularyName, vocabularyColumns } from './vocabulary.js';

/** Aptidão da fazenda: cadastro auxiliar de ordem alfabética. */
export const aptitudes = pgTable('aptitudes', vocabularyColumns(), (table) => [
  uniqueVocabularyName('aptitudes', table),
  tenantIsolationPolicy(),
]);
