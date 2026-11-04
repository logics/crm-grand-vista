import { pgTable, text, unique, uuid } from 'drizzle-orm/pg-core';
import { id, timestamps } from './columns.js';
import { municipalities } from './municipalities.js';
import { tenantId, tenantIsolationPolicy } from './tenant-scope.js';
import { uniqueVocabularyName, vocabularyColumns } from './vocabulary.js';

/** Praça de referência comercial: cadastro auxiliar de ordem alfabética, com municípios atendidos. */
export const tradingPosts = pgTable('trading_posts', vocabularyColumns(), (table) => [
  uniqueVocabularyName('trading_posts', table),
  tenantIsolationPolicy(),
]);

/**
 * Município atendido por uma praça. É o campo extra da praça — por isso a FK para
 * ela é `ON DELETE CASCADE`, a única exceção declarada no registro à regra do
 * `RESTRICT`. O UNIQUE por empresa faz um município pertencer a no máximo uma praça.
 */
export const tradingPostMunicipalities = pgTable(
  'trading_post_municipalities',
  {
    id: id(),
    tenantId: tenantId(),
    tradingPostId: uuid('trading_post_id')
      .notNull()
      .references(() => tradingPosts.id, { onDelete: 'cascade' }),
    municipalityIbgeCode: text('municipality_ibge_code')
      .notNull()
      .references(() => municipalities.ibgeCode),
    ...timestamps,
  },
  (table) => [
    unique('trading_post_municipalities_tenant_id_municipality_unique').on(table.tenantId, table.municipalityIbgeCode),
    tenantIsolationPolicy(),
  ],
);
