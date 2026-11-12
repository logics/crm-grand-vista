import { LEVELS } from '@crm/shared';
import { getTableName, sql } from 'drizzle-orm';
import { check, type AnyPgColumn } from 'drizzle-orm/pg-core';

/**
 * `CHECK` de uma coluna de nível, montado da constante `LEVELS` de `@crm/shared`:
 * nenhuma lista de valores escrita à mão, e nenhum `DOMAIN` (convenção do modelo:
 * `text` + `CHECK`). Aceita nulo, como qualquer `CHECK` do Postgres.
 */
export function levelCheck(column: AnyPgColumn) {
  // DDL não aceita parâmetro: os valores são literais da constante, nunca entrada de usuário.
  const values = sql.raw(LEVELS.map((level) => `'${level}'`).join(', '));
  return check(`${getTableName(column.table)}_${column.name}_check`, sql`${column} in (${values})`);
}
