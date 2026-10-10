// Dados de apoio da suíte de integração. O database de teste é zerado a cada
// execução, mas não entre arquivos: todo slug é único para os arquivos não colidirem.
import type { Database } from '../src/database.js';
import { accessProfiles, tenants } from '../src/schema/index.js';
import { uuidv7 } from '../src/uuid.js';

/** Cria uma empresa pelo mesmo caminho do CLI de provisionamento e devolve o id. */
export async function createTenant(db: Database, name: string): Promise<string> {
  const [tenant] = await db.semTenant({ reason: 'cli' }, (tx) =>
    tx
      .insert(tenants)
      .values({ slug: `${name}-${uuidv7()}`, name })
      .returning({ id: tenants.id }),
  );
  if (!tenant) throw new Error(`A empresa "${name}" não foi criada.`);
  return tenant.id;
}

/** Cria um perfil de acesso dentro da empresa informada e devolve o id. */
export async function createAccessProfile(db: Database, tenantId: string, name: string): Promise<string> {
  const [profile] = await db.withTenant(tenantId, (tx) =>
    tx.insert(accessProfiles).values({ tenantId, name }).returning({ id: accessProfiles.id }),
  );
  if (!profile) throw new Error(`O perfil de acesso "${name}" não foi criado.`);
  return profile.id;
}
