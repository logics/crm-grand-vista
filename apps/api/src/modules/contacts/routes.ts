// Rotas de contatos, montadas sob `/e/:tenant/contacts`. Base compartilhada:
// quem tem `contatos.ver` vê todos; não há cláusula de escopo de dados.
import {
  BUYER_PROFILE_CONCURRENT_SAVE_MESSAGE,
  CONTACT_NOT_FOUND_MESSAGE,
  TAX_ID_TAKEN_MESSAGE,
  contactDuplicatesQuerySchema,
  contactListQuerySchema,
  contactOptionsQuerySchema,
  FORBIDDEN_MESSAGE,
  createContactSchema,
  updateContactSchema,
} from '@crm/shared';
import { zValidator } from '@hono/zod-validator';
import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { databaseError, isForeignKeyInUse, SQLSTATE } from '../../database-error.js';
import { noPermissionRequired, requirePermission } from '../../authorization/route-access.js';
import { createHistoryRoutes } from '../../history/routes.js';
import { hydrateContactNames, listContactOptions } from './options.js';
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
  findDuplicates,
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

const taxIdMismatch = (message: string) => ({ error: { code: 'validation_error', message, field: 'taxId' } }) as const;

/** Constraints únicas do perfil de compra e das junções, que o driver aponta quando dois saves do mesmo contato empatam. */
const BUYER_PROFILE_UNIQUE_CONSTRAINTS = new Set([
  'buyer_profiles_contact_id_unique',
  'buyer_regions_contact_id_municipality_unique',
  'buyer_regions_contact_id_uf_unique',
  'buyer_crops_contact_id_crop_id_unique',
  'buyer_payment_methods_contact_id_payment_method_id_unique',
]);
/** Constraint do índice único `(tenant_id, tax_id)`, que o driver aponta quando duas gravações empatam. */
const TAX_ID_UNIQUE_INDEX = 'contacts_tenant_id_tax_id_unique';

function violatesTaxIdUniqueIndex(error: unknown): boolean {
  const { code, constraint } = databaseError(error);
  return code === SQLSTATE.uniqueViolation && constraint === TAX_ID_UNIQUE_INDEX;
}

/** Id malformado é contato que não existe (404), não requisição inválida. */
const isId = (c: Context<TenantEnv>) => idSchema.safeParse(c.req.param('id')).success;

const conflict = (message: string) => ({ error: { code: 'conflict', message } }) as const;

const canView = () => requirePermission('contatos.ver');

const forbidden = { error: { code: 'forbidden', message: FORBIDDEN_MESSAGE } } as const;

/** Dados financeiros do comprador: ver e editar dependem de uma permissão própria. */
const hasFinancialAccess = (c: Context<TenantEnv>) => c.var.access.permissions.has('contatos.ver_dados_financeiros');

/** Enviou patrimônio ou capacidade — com valor ou `null` explícito (que apagaria). Ausente não conta. */
const sendsFinancialKeys = (profile: { estimatedNetWorth?: unknown; investmentCapacity?: unknown } | null | undefined) =>
  !!profile && (profile.estimatedNetWorth !== undefined || profile.investmentCapacity !== undefined);

/**
 * A recusa de regra do documento como resposta: duplicado é 409 com o contato
 * existente, documento que não serve ao tipo de pessoa é 400. Outro erro sobe.
 * Duas gravações simultâneas do mesmo documento passam pela pré-checagem do
 * serviço; o índice único pega a segunda, e o dono do documento é buscado de novo.
 */
async function withTaxIdRefusals<T>(c: Context<TenantEnv>, taxId: string | null | undefined, run: () => Promise<T>) {
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
      return c.json(await c.var.withTenant((tx) => listContacts(tx, query, hasFinancialAccess(c))), 200);
    })
    .post('/', requirePermission('contatos.criar'), zValidator('json', createContactSchema), async (c) => {
      const { tenant, userId, withTenant } = c.var;
      const input = c.req.valid('json');
      const financial = hasFinancialAccess(c);
      // Antes de qualquer escrita: sem a permissão, as chaves financeiras são recusadas.
      if (!financial && sendsFinancialKeys(input.buyerProfile)) return c.json(forbidden, 403);
      const result = await withTaxIdRefusals(c, input.taxId, () =>
        withTenant((tx) => createContact(tx, { tenantId: tenant.id, userId }, input, financial)),
      );
      if (!result.ok) return result.response;
      return isRejection(result.value) ? c.json(invalid(result.value.rejected), 400) : c.json(result.value, 201);
    })
    .get(
      '/options',
      // Hidratar por `ids` vale a qualquer vínculo; a busca exige `contatos.ver` (checado abaixo, antes do banco).
      noPermissionRequired,
      zValidator('query', contactOptionsQuerySchema),
      async (c) => {
        const query = c.req.valid('query');
        if (c.var.access.permissions.has('contatos.ver')) {
          return c.json(await c.var.withTenant((tx) => listContactOptions(tx, query)), 200);
        }
        if (query.ids.length === 0) return c.json({ error: { code: 'forbidden', message: FORBIDDEN_MESSAGE } }, 403);
        return c.json(await c.var.withTenant((tx) => hydrateContactNames(tx, query.ids)), 200);
      },
    )
    .get('/duplicates', canView(), zValidator('query', contactDuplicatesQuerySchema), async (c) => {
      const query = c.req.valid('query');
      return c.json({ items: await c.var.withTenant((tx) => findDuplicates(tx, query)) }, 200);
    })
    .get('/:id', canView(), async (c) => {
      if (!isId(c)) return c.json(notFound, 404);
      const contact = await c.var.withTenant((tx) => getContact(tx, c.req.param('id'), hasFinancialAccess(c)));
      return contact ? c.json(contact, 200) : c.json(notFound, 404);
    })
    .patch('/:id', requirePermission('contatos.editar'), zValidator('json', updateContactSchema), async (c) => {
      if (!isId(c)) return c.json(notFound, 404);
      const { tenant, userId, withTenant } = c.var;
      const input = c.req.valid('json');
      const financial = hasFinancialAccess(c);
      // Antes de qualquer escrita: sem a permissão, as chaves financeiras são recusadas, com valor ou `null`.
      if (!financial && sendsFinancialKeys(input.buyerProfile)) return c.json(forbidden, 403);
      try {
        const result = await withTaxIdRefusals(c, input.taxId, () =>
          withTenant((tx) => updateContact(tx, { tenantId: tenant.id, userId }, c.req.param('id'), input, financial)),
        );
        if (!result.ok) return result.response;
        if (isRejection(result.value)) return c.json(invalid(result.value.rejected), 400);
        return result.value ? c.json(result.value, 200) : c.json(notFound, 404);
      } catch (error) {
        if (error instanceof RoleInUseError) return c.json(conflict(error.message), 409);
        // Dois saves simultâneos do perfil: o índice único pega o segundo.
        const { code, constraint } = databaseError(error);
        if (code === SQLSTATE.uniqueViolation && BUYER_PROFILE_UNIQUE_CONSTRAINTS.has(constraint ?? '')) {
          return c.json(conflict(BUYER_PROFILE_CONCURRENT_SAVE_MESSAGE), 409);
        }
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
        if (isForeignKeyInUse(code)) return c.json(conflict(contactInUseMessage(table)), 409);
        throw error;
      }
    })
    .route(
      '/',
      createHistoryRoutes({
        entity: 'contacts',
        access: canView(),
        isVisible: (tx, _c, id) => contactExists(tx, id),
        children: [
          { entity: 'contact_roles', parentColumn: 'contact_id', nameColumn: 'role' },
          { entity: 'buyer_profiles', parentColumn: 'contact_id' },
          { entity: 'buyer_regions', parentColumn: 'contact_id', nameColumn: ['municipality_ibge_code', 'uf'] },
          { entity: 'buyer_crops', parentColumn: 'contact_id', nameColumn: 'crop_id' },
          { entity: 'buyer_payment_methods', parentColumn: 'contact_id', nameColumn: 'payment_method_id' },
        ],
      }),
    );
}
