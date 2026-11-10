// Rotas de contatos, montadas sob `/e/:tenant/contacts`. Base compartilhada:
// quem tem `contatos.ver` vê todos; não há cláusula de escopo de dados.
import {
  CONTACT_NOT_FOUND_MESSAGE,
  TAX_ID_TAKEN_MESSAGE,
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
import {
  RoleInUseError,
  TaxIdMismatchError,
  TaxIdTakenError,
  contactExists,
  contactInUseMessage,
  createContact,
  deleteContact,
  findContactByTaxId,
  getContact,
  isRejection,
  listContacts,
  updateContact,
} from './service.js';

const notFound = { error: { code: 'not_found', message: CONTACT_NOT_FOUND_MESSAGE } } as const;
const invalid = (message: string) => ({ error: { code: 'validation_error', message } }) as const;
const idSchema = z.uuid();

const taxIdConflict = (existing: { id: string; name: string }) =>
  ({ error: { code: 'conflict', message: TAX_ID_TAKEN_MESSAGE, field: 'taxId', existing } }) as const;

const taxIdMismatch = (message: string) =>
  ({ error: { code: 'validation_error', message, field: 'taxId' } }) as const;

/** Constraint do índice único `(tenant_id, tax_id)`, que o driver aponta quando duas gravações empatam. */
const TAX_ID_UNIQUE_INDEX = 'contacts_tenant_id_tax_id_unique';

function violatesTaxIdUniqueIndex(error: unknown): boolean {
  for (let current = error; current instanceof Error; current = current.cause) {
    if ((current as { constraint?: unknown }).constraint === TAX_ID_UNIQUE_INDEX) return true;
  }
  return false;
}

/** Id malformado é contato que não existe (404), não requisição inválida. */
const isId = (c: Context<TenantEnv>) => idSchema.safeParse(c.req.param('id')).success;

const conflict = (message: string) => ({ error: { code: 'conflict', message } }) as const;

/** SQLSTATE e tabela do erro do driver, que o Drizzle embrulha em `cause`. */
function databaseError(error: unknown): { code?: string; table?: string } {
  for (let current = error; current instanceof Error; current = current.cause) {
    const { code, table } = current as { code?: unknown; table?: unknown };
    if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) {
      return { code, ...(typeof table === 'string' ? { table } : {}) };
    }
  }
  return {};
}

// `ON DELETE RESTRICT` falha com 23001; `NO ACTION`, com 23503: os dois são "em uso".
const IN_USE_SQLSTATES = ['23001', '23503'];

const canView = () => requirePermission('contatos.ver');

/**
 * A recusa de regra do documento como resposta: duplicado é 409 com o contato
 * existente, documento que não serve ao tipo de pessoa é 400. Outro erro sobe.
 * Duas gravações simultâneas do mesmo documento passam pela pré-checagem do
 * serviço; o índice único pega a segunda, e o dono do documento é buscado de novo.
 */
async function withTaxIdRefusals<T>(
  c: Context<TenantEnv>,
  taxId: string | null | undefined,
  run: () => Promise<T>,
) {
  try {
    return { ok: true, value: await run() } as const;
  } catch (error) {
    if (error instanceof TaxIdTakenError) return { ok: false, response: c.json(taxIdConflict(error.existing), 409) } as const;
    if (error instanceof TaxIdMismatchError) return { ok: false, response: c.json(taxIdMismatch(error.message), 400) } as const;
    if (taxId && violatesTaxIdUniqueIndex(error)) {
      const existing = await c.var.withTenant((tx) => findContactByTaxId(tx, taxId));
      if (existing) return { ok: false, response: c.json(taxIdConflict(existing), 409) } as const;
    }
    throw error;
  }
}

export function createContactsRoutes() {
  return new Hono<TenantEnv>()
    .get('/', canView(), zValidator('query', contactListQuerySchema), async (c) => {
      const query = c.req.valid('query');
      return c.json(await c.var.withTenant((tx) => listContacts(tx, query)), 200);
    })
    .post('/', requirePermission('contatos.criar'), zValidator('json', createContactSchema), async (c) => {
      const { tenant, userId, withTenant } = c.var;
      const input = c.req.valid('json');
      const result = await withTaxIdRefusals(c, input.taxId, () =>
        withTenant((tx) => createContact(tx, { tenantId: tenant.id, userId }, input)),
      );
      if (!result.ok) return result.response;
      return isRejection(result.value) ? c.json(invalid(result.value.rejected), 400) : c.json(result.value, 201);
    })
    .get('/:id', canView(), async (c) => {
      if (!isId(c)) return c.json(notFound, 404);
      const contact = await c.var.withTenant((tx) => getContact(tx, c.req.param('id')));
      return contact ? c.json(contact, 200) : c.json(notFound, 404);
    })
    .patch('/:id', requirePermission('contatos.editar'), zValidator('json', updateContactSchema), async (c) => {
      if (!isId(c)) return c.json(notFound, 404);
      const { tenant, userId, withTenant } = c.var;
      const input = c.req.valid('json');
      try {
        const result = await withTaxIdRefusals(c, input.taxId, () =>
          withTenant((tx) => updateContact(tx, { tenantId: tenant.id, userId }, c.req.param('id'), input)),
        );
        if (!result.ok) return result.response;
        if (isRejection(result.value)) return c.json(invalid(result.value.rejected), 400);
        return result.value ? c.json(result.value, 200) : c.json(notFound, 404);
      } catch (error) {
        if (error instanceof RoleInUseError) return c.json(conflict(error.message), 409);
        throw error;
      }
    })
    .delete('/:id', requirePermission('contatos.excluir'), async (c) => {
      if (!isId(c)) return c.json(notFound, 404);
      const { tenant, userId, withTenant } = c.var;
      try {
        const removed = await withTenant((tx) => deleteContact(tx, { tenantId: tenant.id, userId }, c.req.param('id')));
        return removed ? c.body(null, 204) : c.json(notFound, 404);
      } catch (error) {
        const { code, table } = databaseError(error);
        if (code && IN_USE_SQLSTATES.includes(code)) return c.json(conflict(contactInUseMessage(table)), 409);
        throw error;
      }
    })
    .route(
      '/',
      createHistoryRoutes({
        entity: 'contacts',
        access: canView(),
        isVisible: (tx, _c, id) => contactExists(tx, id),
        children: [{ entity: 'contact_roles', parentColumn: 'contact_id', nameColumn: 'role' }],
      }),
    );
}
