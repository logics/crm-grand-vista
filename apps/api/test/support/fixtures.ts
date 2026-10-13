// Dados de apoio da suíte de integração da API. O banco de teste é zerado a
// cada execução, mas não entre arquivos: e-mails e slugs são únicos.
import { accounts, memberships, tenants, users, uuidv7, type Database } from '@crm/db';
import { hashPassword } from 'better-auth/crypto';

interface CreatedUser {
  id: string;
  name: string;
  email: string;
  password: string;
}

/**
 * Cria um usuário com credencial de e-mail e senha, do jeito que o CLI de
 * provisionamento cria: não existe rota de cadastro.
 */
export async function createUserWithPassword(
  db: Database,
  name: string,
  options: { isSuperAdmin?: boolean } = {},
): Promise<CreatedUser> {
  const email = `${uuidv7()}@teste.local`;
  const password = `senha-${uuidv7()}`;
  const passwordHash = await hashPassword(password);

  const id = await db.semTenant({ reason: 'cli' }, async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ name, email, isSuperAdmin: options.isSuperAdmin ?? false })
      .returning({ id: users.id });
    if (!user) throw new Error(`O usuário "${name}" não foi criado.`);

    await tx
      .insert(accounts)
      .values({ userId: user.id, accountId: user.id, providerId: 'credential', password: passwordHash });
    return user.id;
  });

  return { id, name, email, password };
}

/** Cria uma empresa e devolve id e slug. */
export async function createTenant(db: Database, name: string): Promise<{ id: string; slug: string; name: string }> {
  const slug = `${name}-${uuidv7()}`;
  const [tenant] = await db.semTenant({ reason: 'cli' }, (tx) =>
    tx.insert(tenants).values({ slug, name }).returning({ id: tenants.id }),
  );
  if (!tenant) throw new Error(`A empresa "${name}" não foi criada.`);
  return { id: tenant.id, slug, name };
}

/** Cria o vínculo entre o usuário e a empresa. */
export async function createMembership(
  db: Database,
  userId: string,
  tenantId: string,
  options: { isDefault?: boolean } = {},
): Promise<void> {
  await db.semTenant({ reason: 'cli' }, (tx) =>
    tx.insert(memberships).values({ userId, tenantId, isDefault: options.isDefault ?? false }),
  );
}
