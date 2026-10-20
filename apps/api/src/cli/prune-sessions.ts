// CLI que apaga sessões e verificações vencidas. Uso:
//   pnpm sessions:prune
// Feito para rodar sem terminal, pelo cron do servidor: não pergunta nada,
// é idempotente e sai com código diferente de 0 se falhar.
import { createDatabase, createPool } from '@crm/db';
import { loadCliEnv } from '@crm/shared/env';
import { pruneExpired } from '../provisioning/prune.js';
import { runCli } from './run.js';

await runCli(async () => {
  const pool = createPool(loadCliEnv().DATABASE_URL);
  try {
    const removed = await pruneExpired(createDatabase(pool));
    console.log(`Sessões vencidas apagadas: ${removed.sessions}`);
    console.log(`Verificações vencidas apagadas: ${removed.verifications}`);
  } finally {
    await pool.end();
  }
});
