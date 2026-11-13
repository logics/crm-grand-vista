// SQLSTATE e tabela do erro do driver, que o Drizzle embrulha em `cause`.

export function databaseError(error: unknown): { code?: string; table?: string } {
  for (let current = error; current instanceof Error; current = current.cause) {
    const { code, table } = current as { code?: unknown; table?: unknown };
    if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) {
      return { code, ...(typeof table === 'string' ? { table } : {}) };
    }
  }
  return {};
}
