import { pgTable } from 'drizzle-orm/pg-core';
import { tenantIsolationPolicy } from './tenant-scope.js';
import { uniqueVocabularyName, vocabularyColumns } from './vocabulary.js';

/** Categoria de documento: cadastro auxiliar de ordem alfabética. */
export const documentCategories = pgTable('document_categories', vocabularyColumns(), (table) => [
  uniqueVocabularyName('document_categories', table),
  tenantIsolationPolicy(),
]);
