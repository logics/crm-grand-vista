// Zera um database de teste e aplica as migrations do zero. Migration que só
// funciona sobre database já povoado é exatamente o que o deploy descobriria.
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { runMigrations } from '../../src/migrate.js';

const PUBLIC_SCHEMA_SQL = new URL('../../sql/public-schema.sql', import.meta.url);

export async function resetTestDatabase(migrationDatabaseUrl: string): Promise<void> {
  const client = new pg.Client({ connectionString: migrationDatabaseUrl });
  await client.connect();
  try {
    const { rows } = await client.query<{ database: string }>('select current_database() as database');
    const database = rows[0]?.database ?? '';
    // Trava contra apontar a suíte para o database errado: isto apaga tudo.
    if (!database.endsWith('_test')) {
      throw new Error(`A suíte só zera bancos *_test; recebeu "${database}".`);
    }

    await client.query('drop schema if exists drizzle cascade');
    await client.query('drop schema if exists public cascade');
    await client.query(await readFile(PUBLIC_SCHEMA_SQL, 'utf8'));
  } finally {
    await client.end();
  }

  await runMigrations(migrationDatabaseUrl);
}
