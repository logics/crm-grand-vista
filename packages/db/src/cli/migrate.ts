import { loadMigrationEnv } from '@crm/shared/env';
import { runMigrations } from '../migrate.js';

const { MIGRATION_DATABASE_URL } = loadMigrationEnv();
await runMigrations(MIGRATION_DATABASE_URL);
console.log('Migrations aplicadas.');
