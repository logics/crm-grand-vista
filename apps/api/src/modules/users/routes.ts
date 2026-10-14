// Rotas de usuários da empresa ativa, montadas sob `/e/:tenant/users`.
import { updateUserSchema } from '@crm/shared';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import type { TenantEnv } from '../../tenant-context.js';
import { listTeamMembers, updateUser } from './service.js';

export function createUsersRoutes() {
  return new Hono<TenantEnv>()
    .get('/', async (c) => {
      const { tenant, withTenant } = c.var;

      return c.json({ users: await withTenant((tx) => listTeamMembers(tx, tenant.id)) }, 200);
    })
    .patch('/:id', zValidator('json', updateUserSchema), async (c) => {
      const { tenant, userId, isSuperAdmin, withTenant } = c.var;
      const targetId = c.req.param('id');

      // Regra provisória, até o middleware de permissão (#11): cada um altera
      // só o próprio usuário; o super admin altera qualquer um da empresa. A
      // recusa vem antes de qualquer consulta e é a mesma para colega e para
      // estranho — não diz quem é da equipe.
      if (targetId !== userId && !isSuperAdmin) {
        return c.json({ error: { code: 'forbidden', message: 'Você só pode alterar o seu próprio usuário.' } }, 403);
      }

      const user = await withTenant((tx) =>
        updateUser(tx, { tenantId: tenant.id, userId }, targetId, c.req.valid('json')),
      );
      if (!user) return c.json({ error: { code: 'not_found', message: 'Usuário não encontrado.' } }, 404);

      return c.json(user, 200);
    });
}
