// Setup da suíte de integração: cria/reforça o banco de teste do checkout,
// derruba os de branches já mergeadas e zera o banco corrente, aplicando as
// migrations do zero (`reset-database.ts`).
import { migrationEnvSchema, parseEnv } from '@crm/shared/env';
import type { TestProject } from 'vitest/node';
import { resetTestDatabase } from './reset-database.js';
import { cleanupMergedTestDatabases, ensureTestDatabase, localGit } from './test-database.js';
import { resolveTestDatabase } from './test-database-name.js';

export default async function setup(project: TestProject): Promise<void> {
  // O setup roda no processo principal, onde o `env` do projeto não é aplicado
  // — só nos workers. Lê o mesmo objeto direto da config (já com o banco do checkout).
  const env = project.config.env as Record<string, string | undefined>;
  const { MIGRATION_DATABASE_URL } = parseEnv(migrationEnvSchema, env);
  const SUPERUSER_DATABASE_URL = env.SUPERUSER_DATABASE_URL;
  if (!SUPERUSER_DATABASE_URL) throw new Error('SUPERUSER_DATABASE_URL ausente: o setup precisa dela para criar o banco de teste.');
  const cwd = project.config.root;
  const { name, branch } = resolveTestDatabase({ env, cwd });
  if (new URL(MIGRATION_DATABASE_URL).pathname !== `/${name}`) {
    throw new Error(`MIGRATION_DATABASE_URL não aponta para o banco de teste do checkout ("${name}").`);
  }

  await ensureTestDatabase({ superuserUrl: SUPERUSER_DATABASE_URL, name, branch });
  await cleanupMergedTestDatabases({ superuserUrl: SUPERUSER_DATABASE_URL, current: name, git: localGit(cwd) });
  await resetTestDatabase(MIGRATION_DATABASE_URL);
}
