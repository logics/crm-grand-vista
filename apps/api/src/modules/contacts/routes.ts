// Rotas de contatos, montadas sob `/e/:tenant/contacts`. Base compartilhada:
// quem tem `contatos.ver` vê todos; não há cláusula de escopo de dados.
import {
  CONTACT_NOT_FOUND_MESSAGE,
  contactListQuerySchema,
  createContactSchema,
  updateContactSchema,
} from '@crm/shared';
import { zValidator } from '@hono/zod-validator';
import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { requirePermission } from '../../authorization/route-access.js';
import { createHistoryRoutes } from '../../history/routes.js';
import type { TenantEnv } from '../../tenant-context.js';
import { contactExists, createContact, getContact, listContacts, updateContact } from './service.js';

const notFound = { error: { code: 'not_found', message: CONTACT_NOT_FOUND_MESSAGE } } as const;
const idSchema = z.uuid();

/** Id malformado é contato que não existe (404), não requisição inválida. */
const isId = (c: Context<TenantEnv>) => idSchema.safeParse(c.req.param('id')).success;

const view = () => requirePermission('contatos.ver');

export function createContactsRoutes() {
  return new Hono<TenantEnv>()
    .get('/', view(), zValidator('query', contactListQuerySchema), async (c) => {
      const query = c.req.valid('query');
      return c.json(await c.var.withTenant((tx) => listContacts(tx, query)), 200);
    })
    .post('/', requirePermission('contatos.criar'), zValidator('json', createContactSchema), async (c) => {
      const { tenant, userId, withTenant } = c.var;
      const input = c.req.valid('json');
      return c.json(await withTenant((tx) => createContact(tx, { tenantId: tenant.id, userId }, input)), 201);
    })
    .get('/:id', view(), async (c) => {
      if (!isId(c)) return c.json(notFound, 404);
      const contact = await c.var.withTenant((tx) => getContact(tx, c.req.param('id')));
      return contact ? c.json(contact, 200) : c.json(notFound, 404);
    })
    .patch('/:id', requirePermission('contatos.editar'), zValidator('json', updateContactSchema), async (c) => {
      if (!isId(c)) return c.json(notFound, 404);
      const { tenant, userId, withTenant } = c.var;
      const input = c.req.valid('json');
      const contact = await withTenant((tx) =>
        updateContact(tx, { tenantId: tenant.id, userId }, c.req.param('id'), input),
      );
      return contact ? c.json(contact, 200) : c.json(notFound, 404);
    })
    .route(
      '/',
      createHistoryRoutes({
        entity: 'contacts',
        access: view(),
        isVisible: (tx, _c, id) => contactExists(tx, id),
        children: [{ entity: 'contact_roles', parentColumn: 'contact_id', nameColumn: 'role' }],
      }),
    );
}
