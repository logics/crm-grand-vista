// Rotas de fazendas, montadas sob `/e/:tenant/farms`. O escopo de dados (`own`
// vê só as fazendas de que é corretor responsável) vale em toda rota que lê ou
// grava uma fazenda: fora dele, 404.
import {
  FARM_NOT_FOUND_MESSAGE,
  FARM_OWNER_CONFLICT_MESSAGE,
  createFarmSchema,
  farmDuplicatesQuerySchema,
  farmListQuerySchema,
  updateFarmSchema,
} from '@crm/shared';
import { zValidator } from '@hono/zod-validator';
import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { databaseError } from '../../database-error.js';
import { requirePermission } from '../../authorization/route-access.js';
import { createHistoryRoutes } from '../../history/routes.js';
import type { TenantEnv } from '../../tenant-context.js';
import { declareRoleUsage } from '../contacts/role-usage.js';
import {
  createFarm,
  farmVisible,
  findFarmDuplicates,
  getFarm,
  isForbidden,
  isRejection,
  listFarms,
  listFarmsOfOwner,
  updateFarm,
} from './service.js';

// Uso declarado do papel proprietário: bloqueia retirar o papel e excluir o contato.
declareRoleUsage('owner', {
  table: 'farm_owners',
  column: 'contact_id',
  label: { singular: 'fazenda', plural: 'fazendas', gender: 'f' },
  inUsePhrase: 'é proprietário de fazenda',
});

const notFound = { error: { code: 'not_found', message: FARM_NOT_FOUND_MESSAGE } } as const;
const idSchema = z.uuid();

/** Id malformado é fazenda que não existe (404), não requisição inválida. */
const isId = (c: Context<TenantEnv>) => idSchema.safeParse(c.req.param('id')).success;

const rejection = (message: string, field?: string) =>
  ({ error: { code: 'validation_error', message, ...(field ? { field } : {}) } }) as const;
const forbidden = (message: string) => ({ error: { code: 'forbidden', message } }) as const;

const conflict = (message: string) => ({ error: { code: 'conflict', message } }) as const;

/** Violação de unicidade em `farm_owners` (dois saves trocando o principal): 409, nunca 500. Outro erro sobe. */
function ownersConflict(error: unknown) {
  const { code, table } = databaseError(error);
  if (code === '23505' && table === 'farm_owners') return conflict(FARM_OWNER_CONFLICT_MESSAGE);
  throw error;
}

const canView = () => requirePermission('fazendas.ver');

export function createFarmsRoutes() {
  return new Hono<TenantEnv>()
    .get('/', canView(), zValidator('query', farmListQuerySchema), async (c) => {
      const query = c.req.valid('query');
      return c.json(await c.var.withTenant((tx) => listFarms(tx, c.var.access, query)), 200);
    })
    .post('/', requirePermission('fazendas.criar'), zValidator('json', createFarmSchema), async (c) => {
      const { tenant, userId, access, withTenant } = c.var;
      let result;
      try {
        result = await withTenant((tx) => createFarm(tx, { tenantId: tenant.id, userId }, access, c.req.valid('json')));
      } catch (error) {
        return c.json(ownersConflict(error), 409);
      }
      if (isForbidden(result)) return c.json(forbidden(result.forbidden), 403);
      if (isRejection(result)) return c.json(rejection(result.rejected, result.field), 400);
      return c.json(result, 201);
    })
    .get('/by-owner/:contactId', canView(), zValidator('query', farmListQuerySchema), async (c) => {
      const contactId = c.req.param('contactId');
      const query = c.req.valid('query');
      // Contato malformado, inexistente ou de outra empresa: lista vazia, sem revelar.
      if (!idSchema.safeParse(contactId).success) return c.json({ items: [], total: 0, page: query.page, pageSize: query.pageSize }, 200);
      return c.json(await c.var.withTenant((tx) => listFarmsOfOwner(tx, c.var.access, contactId, query)), 200);
    })
    // Antes de `/:id`, senão "duplicates" seria lido como id.
    .get('/duplicates', canView(), zValidator('query', farmDuplicatesQuerySchema), async (c) => {
      const query = c.req.valid('query');
      return c.json({ items: await c.var.withTenant((tx) => findFarmDuplicates(tx, c.var.access, query)) }, 200);
    })
    .get('/:id', canView(), async (c) => {
      if (!isId(c)) return c.json(notFound, 404);
      const farm = await c.var.withTenant((tx) => getFarm(tx, c.var.access, c.req.param('id')));
      return farm ? c.json(farm, 200) : c.json(notFound, 404);
    })
    .patch('/:id', requirePermission('fazendas.editar'), zValidator('json', updateFarmSchema), async (c) => {
      if (!isId(c)) return c.json(notFound, 404);
      const { tenant, userId, access, withTenant } = c.var;
      let result;
      try {
        result = await withTenant((tx) =>
          updateFarm(tx, { tenantId: tenant.id, userId }, access, c.req.param('id'), c.req.valid('json')),
        );
      } catch (error) {
        return c.json(ownersConflict(error), 409);
      }
      if (result === null) return c.json(notFound, 404);
      if (isForbidden(result)) return c.json(forbidden(result.forbidden), 403);
      if (isRejection(result)) return c.json(rejection(result.rejected, result.field), 400);
      return c.json(result, 200);
    })
    .route(
      '/',
      createHistoryRoutes({
        entity: 'farms',
        children: [
          { entity: 'farm_aptitudes', parentColumn: 'farm_id', nameColumn: 'aptitude_id' },
          { entity: 'farm_crops', parentColumn: 'farm_id', nameColumn: 'crop_id' },
          {
            entity: 'farm_owners',
            parentColumn: 'farm_id',
            nameColumn: 'contact_id',
            primaryFlag: { column: 'is_primary', label: 'Proprietário principal' },
          },
        ],
        access: canView(),
        isVisible: (tx, c, id) => farmVisible(tx, c.var.access, id),
      }),
    );
}
