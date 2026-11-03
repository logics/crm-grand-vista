import { pgTable } from 'drizzle-orm/pg-core';
import { tenantIsolationPolicy } from './tenant-scope.js';
import { uniqueVocabularyName, vocabularyColumns } from './vocabulary.js';

/** Origem do lead (por onde o contato chegou): cadastro auxiliar de ordem alfabética. */
export const leadSources = pgTable('lead_sources', vocabularyColumns(), (table) => [
  uniqueVocabularyName('lead_sources', table),
  tenantIsolationPolicy(),
]);
