// Resolução da empresa ativa: roda antes de todo handler sob `/e/:tenant/`.
// A URL **pede** uma empresa, nunca autoriza. A ordem é fixa — sessão, slug e
// vínculo, e só então o contexto — e handler nenhum alcança o banco sem ela.
// O super admin dispensa o vínculo: entra em qualquer empresa que exista, pelo
// caminho nominal `semTenant()`, com a empresa inspecionada — nunca um curinga.
import type { Database, Transaction } from '@crm/db';
import { TENANT_BLOCKED_MESSAGE, TENANT_NOT_FOUND_MESSAGE } from '@crm/shared';
import { createMiddleware } from 'hono/factory';
import type { Auth } from './modules/auth/auth.js';
import { resolveTenantAccess, type ActiveTenant } from './modules/auth/service.js';
import { readSession, unauthenticated } from './modules/auth/session.js';

/** Parâmetro de rota que carrega o slug: `/e/:tenant/...`. */
export const TENANT_PARAM = 'tenant';

/** O que todo handler de rota de empresa recebe em `c.var`. */
export interface TenantEnv {
  Variables: {
    /** Id do usuário logado, com vínculo verificado na empresa ativa. */
    userId: string;
    /**
     * Atravessa as verificações de empresa e permissão. Só para decidir acesso
     * — nunca entra em resposta. Lido aqui até a resolução da permissão
     * efetiva (#11) concentrar o curto-circuito.
     */
    isSuperAdmin: boolean;
    tenant: ActiveTenant;
    /**
     * `withTenant()` já preso à empresa ativa: o handler não escolhe — nem
     * erra — a empresa da transação.
     */
    withTenant: <T>(fn: (tx: Transaction) => Promise<T>) => Promise<T>;
  };
}

interface TenantContextDependencies {
  auth: Auth;
  db: Database;
}

export function createTenantContext({ auth, db }: TenantContextDependencies) {
  return createMiddleware<TenantEnv>(async (c, next) => {
    const session = await readSession(auth, c);
    if (!session) return unauthenticated(c);

    const access = await resolveTenantAccess(db, session.user.id, c.req.param(TENANT_PARAM) ?? '');
    if (!access) {
      // 404 e não 403, e o mesmo corpo para slug inexistente e slug sem
      // vínculo: qualquer diferença confirmaria que a empresa existe.
      return c.json({ error: { code: 'tenant_not_found', message: TENANT_NOT_FOUND_MESSAGE } }, 404);
    }

    const { tenant, linked, isSuperAdmin, blocked } = access;
    // Só depois do vínculo: para quem não é da empresa, bloqueada continua
    // sendo o mesmo 404 de inexistente. Quem é dela já sabe que ela existe.
    if (blocked && !isSuperAdmin) {
      return c.json({ error: { code: 'tenant_blocked', message: TENANT_BLOCKED_MESSAGE } }, 403);
    }

    c.set('userId', session.user.id);
    c.set('isSuperAdmin', isSuperAdmin);
    c.set('tenant', tenant);
    c.set('withTenant', (fn) =>
      linked ? db.withTenant(tenant.id, fn) : db.semTenant({ reason: 'super_admin', tenantId: tenant.id }, fn),
    );
    return next();
  });
}
