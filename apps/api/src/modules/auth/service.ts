import { memberships, tenants, users, type Database } from '@crm/db';
import type { SessionTenant } from '@crm/shared';
import { asc, desc, eq, sql } from 'drizzle-orm';

/**
 * Empresas a que o usuário tem vínculo, a padrão primeiro. Fora de
 * `withTenant()` de propósito: é a pergunta que antecede a empresa ativa.
 */
export function listUserTenants(db: Database, userId: string): Promise<SessionTenant[]> {
  return db.semTenant({ reason: 'login' }, (tx) =>
    tx
      .select({ slug: tenants.slug, name: tenants.name, isDefault: memberships.isDefault })
      .from(memberships)
      .innerJoin(tenants, eq(tenants.id, memberships.tenantId))
      .where(eq(memberships.userId, userId))
      .orderBy(desc(memberships.isDefault), asc(tenants.name)),
  );
}

/**
 * Grava o instante do login no usuário, pelo relógio do banco. Não passa pelo
 * wrapper de auditoria: é registro de acesso, não alteração de cadastro.
 */
export async function recordLogin(db: Database, userId: string): Promise<void> {
  await db.semTenant({ reason: 'login' }, (tx) =>
    tx
      .update(users)
      // `updated_at` fica como está: entrar no sistema não altera o cadastro.
      .set({ lastLoginAt: sql`now()`, updatedAt: sql`${users.updatedAt}` })
      .where(eq(users.id, userId)),
  );
}
