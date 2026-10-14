import { memberships, tenants, users, type Database } from '@crm/db';
import type { SessionTenant } from '@crm/shared';
import { and, asc, desc, eq, sql } from 'drizzle-orm';

/**
 * Empresas a que o usuário tem vínculo, a padrão primeiro. Fora de
 * `withTenant()` de propósito: é a pergunta que antecede a empresa ativa.
 */
export function listUserTenants(db: Database, userId: string): Promise<SessionTenant[]> {
  return db.semTenant({ reason: 'login' }, (tx) =>
    tx
      .select({ slug: tenants.slug, name: tenants.name, isDefault: memberships.isDefault, blocked: tenants.blocked })
      .from(memberships)
      .innerJoin(tenants, eq(tenants.id, memberships.tenantId))
      .where(eq(memberships.userId, userId))
      .orderBy(desc(memberships.isDefault), asc(tenants.name)),
  );
}

/** Empresa ativa da requisição, já validada contra quem pede. */
export interface ActiveTenant {
  id: string;
  slug: string;
  name: string;
}

/** Por onde o usuário entrou na empresa: o vínculo, ou a travessia do super admin. */
export interface TenantAccess {
  tenant: ActiveTenant;
  /** Tem vínculo com a empresa. Sem ele, só o super admin chega aqui. */
  linked: boolean;
  isSuperAdmin: boolean;
  /** Empresa bloqueada: quem tem vínculo recebe 403; o super admin entra. */
  blocked: boolean;
}

/**
 * A empresa do slug, se o usuário pode entrar nela — pelo vínculo, ou por ser
 * super admin; nulo caso contrário. Slug, vínculo e flag saem da mesma consulta
 * de propósito: "não existe" e "não é sua" são indistinguíveis para quem chama,
 * na resposta e no tempo dela.
 */
export async function resolveTenantAccess(db: Database, userId: string, slug: string): Promise<TenantAccess | null> {
  const [row] = await db.semTenant({ reason: 'login' }, (tx) =>
    tx
      .select({
        id: tenants.id,
        slug: tenants.slug,
        name: tenants.name,
        blocked: tenants.blocked,
        linked: sql<boolean>`${memberships.id} is not null`,
        isSuperAdmin: users.isSuperAdmin,
      })
      .from(tenants)
      .innerJoin(users, eq(users.id, userId))
      .leftJoin(memberships, and(eq(memberships.tenantId, tenants.id), eq(memberships.userId, userId)))
      .where(eq(tenants.slug, slug)),
  );
  if (!row || !(row.linked || row.isSuperAdmin)) return null;

  const { linked, isSuperAdmin, blocked, ...tenant } = row;
  return { tenant, linked, isSuperAdmin, blocked };
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
