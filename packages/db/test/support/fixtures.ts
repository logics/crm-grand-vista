// Dados de apoio da suíte de integração. O database de teste é zerado a cada
// execução, mas não entre arquivos: todo slug é único para os arquivos não colidirem.
import { loadMigrationEnv } from '@crm/shared/env';
import pg from 'pg';
import type { Database } from '../../src/database.js';
import {
  accessProfiles,
  auditLog,
  profileDataScopes,
  profilePermissions,
  tenants,
  userProfiles,
  users,
} from '../../src/schema/index.js';
import { uuidv7 } from '../../src/uuid.js';

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

/** Cria um usuário, sem vínculo com empresa nenhuma, e devolve o id. */
export async function createUser(db: Database, name: string): Promise<string> {
  const [user] = await db.semTenant({ reason: 'cli' }, (tx) =>
    tx
      .insert(users)
      .values({ name, email: `${uuidv7()}@teste.local` })
      .returning({ id: users.id }),
  );
  if (!user) throw new Error(`O usuário "${name}" não foi criado.`);
  return user.id;
}

/** Cria um perfil de acesso dentro da empresa informada e devolve o id. */
export async function createAccessProfile(db: Database, tenantId: string, name: string): Promise<string> {
  const [profile] = await db.withTenant(tenantId, (tx) =>
    tx.insert(accessProfiles).values({ tenantId, name }).returning({ id: accessProfiles.id }),
  );
  if (!profile) throw new Error(`O perfil de acesso "${name}" não foi criado.`);
  return profile.id;
}

/** Permissão de catálogo usada só pelos testes. */
export const TEST_PERMISSION = 'testes.isolamento';

/**
 * Garante a permissão de teste no catálogo. Vai pelo `crm_owner` porque a
 * aplicação só lê o catálogo — em produção quem o escreve é a migration.
 */
export async function ensureTestPermission(): Promise<void> {
  const owner = new pg.Client({ connectionString: loadMigrationEnv().MIGRATION_DATABASE_URL });
  await owner.connect();
  try {
    await owner.query(
      `insert into permissions (code, module, action, scope, description)
       values ($1, 'testes', 'isolamento', 'tenant', 'Permissão usada só pela suíte de integração')
       on conflict (code) do nothing`,
      [TEST_PERMISSION],
    );
  } finally {
    await owner.end();
  }
}

/**
 * Cria uma empresa com **uma linha em cada tabela de negócio** e devolve o id.
 * Tabela de negócio nova ganha a sua linha aqui: o teste de isolamento falha
 * enquanto ela não tiver.
 */
export async function createTenantWithBusinessData(db: Database, name: string): Promise<string> {
  await ensureTestPermission();
  const tenantId = await createTenant(db, name);
  const userId = await createUser(db, `Usuário de ${name}`);
  const profileId = await createAccessProfile(db, tenantId, `Perfil de ${name}`);

  await db.withTenant(tenantId, async (tx) => {
    await tx.insert(profilePermissions).values({ tenantId, profileId, permissionCode: TEST_PERMISSION });
    await tx.insert(profileDataScopes).values({ tenantId, profileId, module: 'testes', scope: 'own' });
    await tx.insert(userProfiles).values({ tenantId, userId, profileId });
    await tx
      .insert(auditLog)
      .values({ tenantId, entity: 'access_profiles', entityId: profileId, field: 'name', newValue: name, userId });
  });

  return tenantId;
}
