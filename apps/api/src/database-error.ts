// Reconhecimento dos erros do Postgres: SQLSTATE, tabela e constraint do erro do
// driver, que o Drizzle embrulha em `cause`. Cada rota decide a resposta; aqui
// só se identifica a falha, para que nenhum módulo copie o desembrulho.

/** SQLSTATE que as escritas sabem traduzir. */
export const SQLSTATE = {
  uniqueViolation: '23505',
  // `ON DELETE RESTRICT` falha com 23001; `NO ACTION`, com 23503. A regra é do RESTRICT, mas os dois são "em uso".
  restrictViolation: '23001',
  foreignKeyViolation: '23503',
  checkViolation: '23514',
  invalidText: '22P02',
} as const;

export interface DatabaseError {
  code?: string;
  table?: string;
  constraint?: string;
}

/**
 * SQLSTATE do primeiro nível da cadeia que o tem; tabela e constraint, do primeiro
 * nível que as informa (o `pg` põe tudo no mesmo objeto, mas um wrapper pode separar).
 */
export function databaseError(error: unknown): DatabaseError {
  const found: DatabaseError = {};
  for (let current = error; current instanceof Error; current = current.cause) {
    const { code, table, constraint } = current as { code?: unknown; table?: unknown; constraint?: unknown };
    if (found.code === undefined && typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) found.code = code;
    if (found.table === undefined && typeof table === 'string') found.table = table;
    if (found.constraint === undefined && typeof constraint === 'string') found.constraint = constraint;
  }
  return found.code === undefined ? {} : found;
}

/** Exclusão recusada porque outra tabela ainda referencia a linha (RESTRICT ou NO ACTION). */
export function isForeignKeyInUse(code: string | undefined): boolean {
  return code === SQLSTATE.restrictViolation || code === SQLSTATE.foreignKeyViolation;
}
