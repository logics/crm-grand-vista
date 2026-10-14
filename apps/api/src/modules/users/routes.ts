// Rotas de usuários da empresa ativa, montadas sob `/e/:tenant/users`.
import { updateUserSchema } from '@crm/shared';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { noPermissionRequired, requirePermission } from '../../authorization/route-access.js';
import type { TenantEnv } from '../../tenant-context.js';
import { listTeamMembers, updateUser } from './service.js';

export function createUsersRoutes() {
  return new Hono<TenantEnv>()
    // A equipe alimenta o seletor de responsável: todo usuário da empresa a vê.
    .get('/', noPermissionRequired, async (c) => {
      const { tenant, withTenant } = c.var;

      return c.json({ users: await withTenant((tx) => listTeamMembers(tx, tenant.id)) }, 200);
    })
    // Cada um altera o próprio usuário; alterar outro exige `usuarios.gerenciar`.
    // A recusa vem antes de qualquer consulta e é a mesma para colega e para
    // estranho — não diz quem é da equipe.
    .patch(
      '/:id',
      requirePermission('usuarios.gerenciar', { unless: (c) => c.req.param('id') === c.var.userId }),
      zValidator('json', updateUserSchema),
      async (c) => {
        const { tenant, userId, withTenant } = c.var;
        const targetId = c.req.param('id');

        const user = await withTenant((tx) =>
          updateUser(tx, { tenantId: tenant.id, userId }, targetId, c.req.valid('json')),
        );
        if (!user) return c.json({ error: { code: 'not_found', message: 'Usuário não encontrado.' } }, 404);

        return c.json(user, 200);
      },
    );
}
