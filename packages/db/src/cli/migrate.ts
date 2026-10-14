import { loadMigrationEnv } from '@crm/shared/env';
import { runMigrations } from '../migrate.js';

const { MIGRATION_DATABASE_URL } = loadMigrationEnv();
const { inserted, updated, orphaned } = await runMigrations(MIGRATION_DATABASE_URL);
console.log('Migrations aplicadas.');
console.log(`Catálogo de permissões: ${inserted.length} inserida(s), ${updated.length} atualizada(s).`);
if (orphaned.length > 0) {
  console.warn(
    `Permissões no banco que não estão mais no código (remova com migration escrita à mão): ${orphaned.join(', ')}.`,
  );
}
