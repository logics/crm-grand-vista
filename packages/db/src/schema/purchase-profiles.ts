import { pgTable } from 'drizzle-orm/pg-core';
import { tenantIsolationPolicy } from './tenant-scope.js';
import { uniqueVocabularyName, vocabularyColumns } from './vocabulary.js';

/** Perfil de compra do comprador: cadastro auxiliar de ordem alfabética. */
export const purchaseProfiles = pgTable('purchase_profiles', vocabularyColumns(), (table) => [
  uniqueVocabularyName('purchase_profiles', table),
  tenantIsolationPolicy(),
]);
