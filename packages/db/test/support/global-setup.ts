// Setup da suíte de integração: zera o database de teste e aplica as migrations
// do zero. Migration que só funciona sobre database já povoado é exatamente o que
// o deploy descobriria.
import { readFile } from 'node:fs/promises';
import { migrationEnvSchema, parseEnv } from '@crm/shared/env';
import pg from 'pg';
import type { TestProject } from 'vitest/node';
import { runMigrations } from '../../src/migrate.js';

const PUBLIC_SCHEMA_SQL = new URL('../../sql/public-schema.sql', import.meta.url);

export default async function setup(project: TestProject): Promise<void> {
  // O setup roda no processo principal, onde o `env` do projeto (`.env.test`)
  // não é aplicado — só nos workers. Lê o mesmo objeto direto da config.
  const { MIGRATION_DATABASE_URL } = parseEnv(migrationEnvSchema, project.config.env);

  const client = new pg.Client({ connectionString: MIGRATION_DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query<{ database: string }>('select current_database() as database');
    const database = rows[0]?.database ?? '';
    // Trava contra apontar a suíte para o database errado: isto apaga tudo.
    if (!database.endsWith('_test')) {
      throw new Error(`A suíte de integração só zera bancos *_test; recebeu "${database}".`);
    }

    await client.query('drop schema if exists drizzle cascade');
    await client.query('drop schema if exists public cascade');
    await client.query(await readFile(PUBLIC_SCHEMA_SQL, 'utf8'));
  } finally {
    await client.end();
  }

  await runMigrations(MIGRATION_DATABASE_URL);
}
