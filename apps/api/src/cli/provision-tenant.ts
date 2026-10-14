// CLI de provisionamento de empresa. Uso:
//   pnpm tenant:provision --slug grand-vista --name "Grand Vista" \
//     --admin-name "Ana Souza" --admin-email ana@grandvista.com.br
// A senha inicial do administrador é gerada e mostrada uma única vez.
import { parseArgs } from 'node:util';
import { createDatabase, createPool } from '@crm/db';
import { loadCliEnv } from '@crm/shared/env';
import { provisionTenant, ProvisioningError } from '../provisioning/tenant.js';
import { runCli } from './run.js';

await runCli(async () => {
  const { values } = parseArgs({
    options: {
      slug: { type: 'string' },
      name: { type: 'string' },
      'admin-name': { type: 'string' },
      'admin-email': { type: 'string' },
    },
  });

  const pool = createPool(loadCliEnv().DATABASE_URL);
  try {
    const { tenant, admin } = await provisionTenant(createDatabase(pool), {
      slug: values.slug ?? '',
      name: values.name ?? '',
      admin: { name: values['admin-name'] ?? '', email: values['admin-email'] ?? '' },
    });

    console.log(`Empresa "${tenant.name}" provisionada em /e/${tenant.slug}.`);
    console.log('Perfis de acesso semeados: Admin, Gestor e Corretor.');
    console.log(`Administrador: ${admin.name} <${admin.email}>, com o perfil de acesso Admin.`);
    console.log(`Senha inicial: ${admin.password}`);
    console.log('Ela não fica guardada em lugar nenhum: entregue-a agora ao administrador.');
  } finally {
    await pool.end();
  }
}, ProvisioningError);
