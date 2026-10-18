// Setup da suíte de integração: zera o database de teste e aplica as migrations
// do zero (`reset-database.ts`).
import { migrationEnvSchema, parseEnv } from '@crm/shared/env';
import type { TestProject } from 'vitest/node';
import { resetTestDatabase } from './reset-database.js';

export default async function setup(project: TestProject): Promise<void> {
  // O setup roda no processo principal, onde o `env` do projeto (`.env.test`)
  // não é aplicado — só nos workers. Lê o mesmo objeto direto da config.
  const { MIGRATION_DATABASE_URL } = parseEnv(migrationEnvSchema, project.config.env);
  await resetTestDatabase(MIGRATION_DATABASE_URL);
}
