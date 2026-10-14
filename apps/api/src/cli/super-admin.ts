// CLI que marca ou desmarca o super admin. Uso:
//   pnpm super-admin grant <e-mail>
//   pnpm super-admin revoke <e-mail>
// Exige confirmação interativa — digitar de novo o e-mail — e não tem modo de
// listar quem já é: a listagem é o que tornaria a flag descobrível.
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';
import { createDatabase, createPool } from '@crm/db';
import { loadCliEnv } from '@crm/shared/env';
import { findSuperAdminTarget, setSuperAdmin } from '../provisioning/super-admin.js';
import { CliError, runCli } from './run.js';

const ACTIONS = { grant: true, revoke: false } as const;
const USAGE = 'Uso: pnpm super-admin <grant|revoke> <e-mail>';

async function confirm(question: string): Promise<string> {
  const prompt = createInterface({ input: stdin, output: stdout });
  try {
    return (await prompt.question(question)).trim();
  } finally {
    prompt.close();
  }
}

await runCli(async () => {
  const { positionals } = parseArgs({ allowPositionals: true });
  const [action, email] = positionals;
  if (positionals.length !== 2 || !email || !(action === 'grant' || action === 'revoke')) throw new CliError(USAGE);
  // Sem terminal não há confirmação explícita: um pipe ou um script não confirma.
  if (!stdin.isTTY) throw new CliError('Este comando exige um terminal interativo para a confirmação.');

  const pool = createPool(loadCliEnv().DATABASE_URL);
  try {
    const db = createDatabase(pool);
    const target = await findSuperAdminTarget(db, email);
    if (!target) throw new CliError(`Nenhum usuário com o e-mail ${email}.`);

    const enabled = ACTIONS[action];
    const verb = enabled ? 'MARCAR' : 'DESMARCAR';
    console.log(`Você vai ${verb} como super admin: ${target.name} <${target.email}>.`);
    const typed = await confirm('Para confirmar, digite o e-mail do usuário: ');
    if (typed.toLowerCase() !== target.email) throw new CliError('Confirmação não confere. Nada foi alterado.');

    const changed = await setSuperAdmin(db, target.id, enabled);
    console.log(changed ? 'Feito. A mudança foi registrada no log de auditoria.' : 'Nada mudou: o usuário já estava assim.');
  } finally {
    await pool.end();
  }
});
