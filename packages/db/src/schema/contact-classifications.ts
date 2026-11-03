import { pgTable } from 'drizzle-orm/pg-core';
import { tenantIsolationPolicy } from './tenant-scope.js';
import { uniqueVocabularyName, vocabularyColumns } from './vocabulary.js';

/** Classificação do cliente: cadastro auxiliar de ordem alfabética. */
export const contactClassifications = pgTable('contact_classifications', vocabularyColumns(), (table) => [
  uniqueVocabularyName('contact_classifications', table),
  tenantIsolationPolicy(),
]);
