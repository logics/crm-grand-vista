import { boolean, char, check, pgTable, text } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { REGIONS } from '../municipalities/types.js';

/**
 * Município do IBGE — dado de referência, carregado pelas migrations a partir do
 * snapshot (`data/municipalities.json`). Fora do RLS e sem timestamps: não é
 * registro de negócio. Nunca se exclui; o que some da lista do IBGE fica inativo.
 */
export const municipalities = pgTable(
  'municipalities',
  {
    /** Código IBGE de sete dígitos — exceção à regra do UUIDv7. */
    ibgeCode: text('ibge_code').primaryKey(),
    name: text('name').notNull(),
    uf: char('uf', { length: 2 }).notNull(),
    /** Grande região, derivada da UF e guardada para os gráficos regionais agruparem no SQL. */
    region: text('region').notNull(),
    active: boolean('active').notNull().default(true),
  },
  (table) => [
    check('municipalities_region_check', sql`${table.region} in (${sql.raw(REGIONS.map((region) => `'${region}'`).join(','))})`),
  ],
);
