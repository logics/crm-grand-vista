// Rota de municípios, montada sob `/e/:tenant/municipalities`. Só leitura.
import { ufSchema } from '@crm/shared';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { noPermissionRequired } from '../../authorization/route-access.js';
import type { TenantEnv } from '../../tenant-context.js';
import { decodeCursor, findMunicipalitiesByCodes, searchMunicipalities } from './service.js';

const ibgeCodeSchema = z.string().regex(/^\d{7}$/, 'Código IBGE deve ter sete dígitos.');

const searchQuerySchema = z.object({
  q: z.string().optional(),
  uf: ufSchema.optional(),
  // "3550308,5208707": hidratação por código, sem busca nem paginação.
  ids: z
    .string()
    .transform((ids) => ids.split(','))
    .pipe(z.array(ibgeCodeSchema).min(1))
    .optional(),
  cursor: z
    .string()
    .transform((cursor, ctx) => {
      const offset = decodeCursor(cursor);
      if (offset === null) ctx.addIssue({ code: 'custom', message: 'Cursor inválido.' });
      return offset ?? z.NEVER;
    })
    .optional(),
});

export function createMunicipalitiesRoutes() {
  return new Hono<TenantEnv>().get('/', noPermissionRequired, zValidator('query', searchQuerySchema), async (c) => {
    const { q, uf, ids, cursor } = c.req.valid('query');

    const page = await c.var.withTenant((tx) =>
      ids ? findMunicipalitiesByCodes(tx, ids) : searchMunicipalities(tx, { q, uf, offset: cursor }),
    );
    return c.json(page, 200);
  });
}
