// Fábrica da rota de histórico: cada módulo a monta sob o próprio recurso
// (`GET /<recurso>/:id/history`), com a permissão e a verificação de
// visibilidade do detalhe dele. Não há rota genérica `/history/:entity/:id`:
// ela reimplementaria fora do módulo a permissão e o escopo de dados.
import type { Transaction } from '@crm/db';
import { FIELD_REGISTRY, type RegisteredTable } from '@crm/shared';
import { zValidator } from '@hono/zod-validator';
import { Hono, type Context, type MiddlewareHandler } from 'hono';
import { z } from 'zod';
import type { TenantEnv } from '../tenant-context.js';
import { inflect, type HistoryChildDeclaration } from './assemble.js';
import { decodeCursor, readHistory } from './query.js';

const historyQuerySchema = z.object({
  cursor: z
    .string()
    .transform((cursor, ctx) => {
      const id = decodeCursor(cursor);
      if (id === null) ctx.addIssue({ code: 'custom', message: 'Cursor inválido.' });
      return id ?? z.NEVER;
    })
    .optional(),
});

const idSchema = z.uuid();

export interface HistoryRouteOptions {
  entity: RegisteredTable;
  /**
   * A declaração de acesso da rota (`requirePermission` ou
   * `noPermissionRequired`): a mesma do detalhe do registro, recusando antes
   * de tocar o banco.
   */
  access: MiddlewareHandler<TenantEnv>;
  /**
   * Se o leitor vê o registro — a mesma verificação do detalhe, com o escopo
   * de dados. Invisível e inexistente são o mesmo 404.
   */
  isVisible: (tx: Transaction, c: Context<TenantEnv>, id: string) => Promise<boolean>;
  /**
   * Tabelas filhas cujas alterações entram na entrada do mesmo save, cada uma
   * com a coluna do pai e, se houver, o filtro de visibilidade por linha.
   */
  children?: readonly HistoryChildDeclaration<RegisteredTable>[];
}

export function createHistoryRoutes({ entity, access, isVisible, children }: HistoryRouteOptions) {
  const { label, gender } = FIELD_REGISTRY[entity];
  const notFound = { error: { code: 'not_found', message: `${label} ${inflect('não encontrado', gender)}.` } } as const;

  return new Hono<TenantEnv>().get('/:id/history', access, zValidator('query', historyQuerySchema), async (c) => {
    const id = c.req.param('id');
    const { cursor } = c.req.valid('query');

    // O id é conferido aqui, e não por `zValidator`: malformado é registro que
    // não existe (404), não requisição inválida (400).
    const page = idSchema.safeParse(id).success
      ? await c.var.withTenant(async (tx) =>
          (await isVisible(tx, c, id)) ? readHistory(tx, { entity, entityId: id, children, reader: c.var.access, cursor }) : null,
        )
      : null;
    if (!page) return c.json(notFound, 404);

    return c.json(page, 200);
  });
}
