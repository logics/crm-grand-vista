// Rotas de fazendas, montadas sob `/e/:tenant/farms`. O escopo de dados (`own`
// vê só as fazendas de que é corretor responsável) vale em toda rota que lê ou
// grava uma fazenda: fora dele, 404.
import { FARM_NOT_FOUND_MESSAGE, createFarmSchema, farmListQuerySchema, updateFarmSchema } from '@crm/shared';
import { zValidator } from '@hono/zod-validator';
import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { requirePermission } from '../../authorization/route-access.js';
import { createHistoryRoutes } from '../../history/routes.js';
import type { TenantEnv } from '../../tenant-context.js';
import { createFarm, deleteFarm, farmVisible, getFarm, isDeleteRefused, isForbidden, isRejection, listFarms, updateFarm } from './service.js';

const notFound = { error: { code: 'not_found', message: FARM_NOT_FOUND_MESSAGE } } as const;
const idSchema = z.uuid();

/** Id malformado é fazenda que não existe (404), não requisição inválida. */
const isId = (c: Context<TenantEnv>) => idSchema.safeParse(c.req.param('id')).success;

const rejection = (message: string, field?: string) =>
  ({ error: { code: 'validation_error', message, ...(field ? { field } : {}) } }) as const;
const forbidden = (message: string) => ({ error: { code: 'forbidden', message } }) as const;

const canView = () => requirePermission('fazendas.ver');

export function createFarmsRoutes() {
  return new Hono<TenantEnv>()
    .get('/', canView(), zValidator('query', farmListQuerySchema), async (c) => {
      const query = c.req.valid('query');
      return c.json(await c.var.withTenant((tx) => listFarms(tx, c.var.access, query)), 200);
    })
    .post('/', requirePermission('fazendas.criar'), zValidator('json', createFarmSchema), async (c) => {
      const { tenant, userId, access, withTenant } = c.var;
      const result = await withTenant((tx) => createFarm(tx, { tenantId: tenant.id, userId }, access, c.req.valid('json')));
      if (isForbidden(result)) return c.json(forbidden(result.forbidden), 403);
      if (isRejection(result)) return c.json(rejection(result.rejected, result.field), 400);
      return c.json(result, 201);
    })
    .get('/:id', canView(), async (c) => {
      if (!isId(c)) return c.json(notFound, 404);
      const farm = await c.var.withTenant((tx) => getFarm(tx, c.var.access, c.req.param('id')));
      return farm ? c.json(farm, 200) : c.json(notFound, 404);
    })
    .patch('/:id', requirePermission('fazendas.editar'), zValidator('json', updateFarmSchema), async (c) => {
      if (!isId(c)) return c.json(notFound, 404);
      const { tenant, userId, access, withTenant } = c.var;
      const result = await withTenant((tx) =>
        updateFarm(tx, { tenantId: tenant.id, userId }, access, c.req.param('id'), c.req.valid('json')),
      );
      if (result === null) return c.json(notFound, 404);
      if (isForbidden(result)) return c.json(forbidden(result.forbidden), 403);
      if (isRejection(result)) return c.json(rejection(result.rejected, result.field), 400);
      return c.json(result, 200);
    })
    .delete('/:id', requirePermission('fazendas.excluir'), async (c) => {
      if (!isId(c)) return c.json(notFound, 404);
      const { tenant, userId, access, withTenant } = c.var;
      const result = await withTenant((tx) => deleteFarm(tx, { tenantId: tenant.id, userId }, access, c.req.param('id')));
      if (result === null) return c.json(notFound, 404);
      if (isDeleteRefused(result)) return c.json({ error: { code: 'conflict', message: result.conflict } }, 409);
      return c.body(null, 204);
    })
    .route(
      '/',
      createHistoryRoutes({
        entity: 'farms',
        access: canView(),
        isVisible: (tx, c, id) => farmVisible(tx, c.var.access, id),
      }),
    );
}
