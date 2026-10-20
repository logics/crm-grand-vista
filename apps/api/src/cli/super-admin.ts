// CLI do super admin. Uso:
//   pnpm super-admin grant <e-mail>
//   pnpm super-admin revoke <e-mail>
//   pnpm super-admin create --name "Nome" --email <e-mail>
// Exige confirmação interativa — digitar de novo o e-mail — e não tem modo de
// listar quem já é: a listagem é o que tornaria a flag descobrível. O `create`
// gera a senha, mostrada uma única vez, e não dá vínculo com empresa alguma.
import { parseArgs } from 'node:util';
import { createDatabase, createPool } from '@crm/db';
import { loadCliEnv } from '@crm/shared/env';
import { ProvisioningError } from '../provisioning/tenant.js';
import { findSuperAdminTarget, setSuperAdmin } from '../provisioning/super-admin.js';
import { createSuperAdmin } from '../provisioning/user.js';
import { CliError, confirmEmail, requireTty, runCli } from './run.js';

const ACTIONS = { grant: true, revoke: false } as const;
const USAGE = 'Uso: pnpm super-admin <grant|revoke> <e-mail>\n     pnpm super-admin create --name <nome> --email <e-mail>';

async function createCommand(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: { name: { type: 'string' }, email: { type: 'string' } },
  });
  if (positionals.length > 0 || !values.name || !values.email) throw new CliError(USAGE);
  requireTty();

  const email = values.email.trim().toLowerCase();
  console.log(`Você vai CRIAR um super admin, sem vínculo com empresa: ${values.name} <${email}>.`);
  await confirmEmail(email);

  const pool = createPool(loadCliEnv().DATABASE_URL);
  try {
    const admin = await createSuperAdmin(createDatabase(pool), { name: values.name, email });
    console.log(`Super admin criado: ${admin.name} <${admin.email}>. A criação foi registrada no log de auditoria.`);
    console.log(`Senha inicial: ${admin.password}`);
    console.log('Ela não fica guardada em lugar nenhum: entregue-a agora.');
  } finally {
    await pool.end();
  }
}

async function flagCommand(action: 'grant' | 'revoke', email: string) {
  requireTty();

  const pool = createPool(loadCliEnv().DATABASE_URL);
  try {
    const db = createDatabase(pool);
    const target = await findSuperAdminTarget(db, email);
    if (!target) throw new CliError(`Nenhum usuário com o e-mail ${email}.`);

    const enabled = ACTIONS[action];
    const verb = enabled ? 'MARCAR' : 'DESMARCAR';
    console.log(`Você vai ${verb} como super admin: ${target.name} <${target.email}>.`);
    await confirmEmail(target.email);

    const changed = await setSuperAdmin(db, target.id, enabled);
    console.log(changed ? 'Feito. A mudança foi registrada no log de auditoria.' : 'Nada mudou: o usuário já estava assim.');
  } finally {
    await pool.end();
  }
}

await runCli(async () => {
  const [action, ...rest] = process.argv.slice(2);
  if (action === 'create') return createCommand(rest);

  const { positionals } = parseArgs({ allowPositionals: true });
  const [, email] = positionals;
  if (positionals.length !== 2 || !email || !(action === 'grant' || action === 'revoke')) throw new CliError(USAGE);
  return flagCommand(action, email);
}, ProvisioningError);
