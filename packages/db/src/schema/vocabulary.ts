// A forma comum dos cadastros auxiliares (`docs/specs/modelo-de-dados.md`,
// seção 3), declarada uma vez: cada tabela de cadastro espalha estas colunas e
// o índice de unicidade do nome, e só acrescenta o que é dela.
import { sql, type SQL } from 'drizzle-orm';
import { boolean, integer, text, uniqueIndex, type AnyPgColumn, type PgTable } from 'drizzle-orm/pg-core';
import { id, timestamps } from './columns.js';
import { tenantId } from './tenant-scope.js';

/**
 * O nome sem caixa nem acento, pela função `IMMUTABLE` da migration que envolve
 * o `unaccent` (o próprio `unaccent` não é imutável e não entra em índice). É a
 * chave de unicidade do nome e a de toda comparação "este nome já existe".
 */
export const normalizedVocabularyName = (name: AnyPgColumn | SQL | string): SQL =>
  sql`normalize_vocabulary_name(${name})`;

export const vocabularyColumns = () => ({
  id: id(),
  tenantId: tenantId(),
  /** Gravado como digitado, sem espaços nas pontas. */
  name: text('name').notNull(),
  /** Só vale em cadastro de ordem manual; no alfabético fica em 0. */
  displayOrder: integer('display_order').notNull().default(0),
  active: boolean('active').notNull().default(true),
  ...timestamps,
});

/** Nome único por empresa, ignorando caixa e acento: "soja" e "Sója" colidem com "Soja". */
export const uniqueVocabularyName = (tableName: string, table: { tenantId: AnyPgColumn; name: AnyPgColumn }) =>
  uniqueIndex(`${tableName}_tenant_id_name_unique`).on(table.tenantId, normalizedVocabularyName(table.name));

/** Tabela de cadastro auxiliar: o que o serviço do motor precisa dela. */
export type VocabularyTable = PgTable & {
  id: AnyPgColumn;
  tenantId: AnyPgColumn;
  name: AnyPgColumn;
  active: AnyPgColumn;
};
