// CLI que cadastra um usuário numa empresa existente. Uso:
//   pnpm user:create --name "Bia Corretora" --email bia@grandvista.com.br \
//     --tenant grand-vista --profile Corretor
// O perfil de acesso é o nome de um da empresa (Admin, Gestor, Corretor ou outro).
// A senha é gerada e mostrada uma única vez; e-mail já cadastrado ganha só o
// vínculo novo e mantém a senha, que a saída não mostra.
import { parseArgs } from 'node:util';
import { createDatabase, createPool } from '@crm/db';
import { loadCliEnv } from '@crm/shared/env';
import { ProvisioningError } from '../provisioning/tenant.js';
import { createUser } from '../provisioning/user.js';
import { runCli } from './run.js';

await runCli(async () => {
  const { values } = parseArgs({
    options: {
      name: { type: 'string' },
      email: { type: 'string' },
      tenant: { type: 'string' },
      profile: { type: 'string' },
    },
  });

  const pool = createPool(loadCliEnv().DATABASE_URL);
  try {
    const created = await createUser(createDatabase(pool), {
      name: values.name ?? '',
      email: values.email ?? '',
      tenantSlug: values.tenant ?? '',
      profile: values.profile ?? '',
    });

    const { user, tenant } = created;
    const suffix = created.isDefault ? ' (empresa padrão do usuário)' : '';
    console.log(`${user.name} <${user.email}> agora tem acesso a "${tenant.name}" (/e/${tenant.slug}), com o perfil de acesso ${created.profile}${suffix}.`);
    if (created.password) {
      console.log(`Senha inicial: ${created.password}`);
      console.log('Ela não fica guardada em lugar nenhum: entregue-a agora ao usuário.');
    } else {
      console.log('O usuário já existia: a senha atual foi mantida.');
    }
  } finally {
    await pool.end();
  }
}, ProvisioningError);
