// Rotas de permissões da empresa ativa, montadas sob `/e/:tenant/permissions`.
import { Hono } from 'hono';
import { noPermissionRequired, requirePermission } from '../../authorization/route-access.js';
import type { TenantEnv } from '../../tenant-context.js';
import { listTenantPermissions, serializeEffectiveAccess } from './service.js';

export function createPermissionsRoutes() {
  return new Hono<TenantEnv>()
    .get('/', requirePermission('configuracoes.gerenciar'), async (c) => {
      return c.json({ permissions: await c.var.withTenant(listTenantPermissions) }, 200);
    })
    // Para o front esconder botão e item de menu que levariam a 403. É
    // cortesia, não controle: quem decide é `requirePermission`, rota a rota.
    .get('/effective', noPermissionRequired, (c) => c.json(serializeEffectiveAccess(c.var.access), 200));
}
