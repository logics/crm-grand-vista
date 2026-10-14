import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { type CatalogSyncReport, syncPermissionCatalog } from './permission-catalog.js';

// Resolve igual a partir de `src/` e de `dist/`: os dois ficam um nível abaixo.
export const MIGRATIONS_FOLDER = fileURLToPath(new URL('../migrations', import.meta.url));

/**
 * Aplica as migrations pendentes e, em seguida, sincroniza o catálogo de
 * permissões do código. Recebe a conexão do `crm_owner`, nunca a do `crm_app`.
 *
 * A sincronização vem depois das migrations: uma migration escrita à mão que
 * remove ou muda o escopo de uma permissão roda antes, e o catálogo do código já
 * a reflete. Por isso nenhuma migration pode depender de permissão nova do
 * catálogo — num banco zerado, ela ainda não existe.
 */
export async function runMigrations(connectionString: string): Promise<CatalogSyncReport> {
  const pool = new pg.Pool({ connectionString, max: 1 });
  try {
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    return await syncPermissionCatalog(db);
  } finally {
    await pool.end();
  }
}
