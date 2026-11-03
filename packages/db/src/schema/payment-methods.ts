import { pgTable } from 'drizzle-orm/pg-core';
import { tenantIsolationPolicy } from './tenant-scope.js';
import { uniqueVocabularyName, vocabularyColumns } from './vocabulary.js';

/** Forma de pagamento: cadastro auxiliar de ordem alfabética. */
export const paymentMethods = pgTable('payment_methods', vocabularyColumns(), (table) => [
  uniqueVocabularyName('payment_methods', table),
  tenantIsolationPolicy(),
]);
