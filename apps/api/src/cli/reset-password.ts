// CLI que redefine a senha de um usuário. Uso:
//   pnpm user:reset-password <e-mail>
// Gera uma senha nova, mostrada uma única vez, e encerra todas as sessões do
// usuário. Vale para qualquer usuário, sem dizer se ele é super admin.
import { parseArgs } from 'node:util';
import { createDatabase, createPool } from '@crm/db';
import { loadCliEnv } from '@crm/shared/env';
import { findPasswordResetTarget, resetPassword } from '../provisioning/password.js';
import { CliError, confirmEmail, requireTty, runCli } from './run.js';

await runCli(async () => {
  const { positionals } = parseArgs({ allowPositionals: true });
  const [email] = positionals;
  if (positionals.length !== 1 || !email) throw new CliError('Uso: pnpm user:reset-password <e-mail>');
  requireTty();

  const pool = createPool(loadCliEnv().DATABASE_URL);
  try {
    const db = createDatabase(pool);
    const target = await findPasswordResetTarget(db, email);
    if (!target) throw new CliError(`Nenhum usuário com o e-mail ${email}.`);

    console.log(`Você vai REDEFINIR a senha de: ${target.name} <${target.email}>. Todas as sessões dele serão encerradas.`);
    await confirmEmail(target.email);

    const password = await resetPassword(db, target.id);
    console.log('Senha redefinida e sessões encerradas. A mudança foi registrada no log de auditoria.');
    console.log(`Nova senha: ${password}`);
    console.log('Ela não fica guardada em lugar nenhum: entregue-a agora ao usuário.');
  } finally {
    await pool.end();
  }
});
