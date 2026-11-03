// Rotas de Configurações, montadas sob `/e/:tenant/settings`. Os cadastros
// auxiliares são um conjunto de rotas só, parametrizado pela chave do registro
// de `@crm/shared`.
import {
  createVocabularyEntrySchema,
  findVocabulary,
  updateVocabularyEntrySchema,
  VOCABULARY_IN_USE_MESSAGE,
  VOCABULARY_NAME_TAKEN_MESSAGE,
  vocabulariesByLabel,
  vocabularyListQuerySchema,
  type VocabularyKey,
  type VocabularyMenuItem,
} from '@crm/shared';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { requirePermission } from '../../authorization/route-access.js';
import type { TenantEnv } from '../../tenant-context.js';
import { createEntry, deleteEntry, listEntries, updateEntry } from './service.js';

interface VocabularyEnv extends TenantEnv {
  Variables: TenantEnv['Variables'] & { vocabulary: VocabularyKey };
}

const notFound = (message: string) => ({ error: { code: 'not_found', message } });
const conflict = (message: string) => ({ error: { code: 'conflict', message } });

/** Código SQLSTATE do erro do driver, que o Drizzle embrulha em `cause`. */
function sqlState(error: unknown): string | undefined {
  for (let current = error; current instanceof Error; current = current.cause) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) return code;
  }
  return undefined;
}

/** SQLSTATE que as escritas dos cadastros sabem traduzir. */
const SQLSTATE = {
  uniqueViolation: '23505',
  // `ON DELETE RESTRICT` falha com 23001; `NO ACTION`, com 23503. A regra é do RESTRICT, mas os dois são "em uso".
  restrictViolation: '23001',
  foreignKeyViolation: '23503',
  invalidText: '22P02',
} as const;

const ENTRY_NOT_FOUND = 'Entrada não encontrada.';

/**
 * A resposta para a falha do banco que a regra conhece, ou nada para as demais
 * (que sobem como 500). As escritas só chegam aqui quando a pré-checagem do
 * serviço não pegou: duas criações simultâneas do mesmo nome, exclusão de
 * entrada em uso (a FK `RESTRICT` de quem consome o cadastro) e id que não é uuid.
 */
function databaseRefusal(error: unknown) {
  switch (sqlState(error)) {
    case SQLSTATE.uniqueViolation:
      return { status: 409, body: conflict(VOCABULARY_NAME_TAKEN_MESSAGE) } as const;
    case SQLSTATE.restrictViolation:
    case SQLSTATE.foreignKeyViolation:
      return { status: 409, body: conflict(VOCABULARY_IN_USE_MESSAGE) } as const;
    case SQLSTATE.invalidText:
      return { status: 404, body: notFound(ENTRY_NOT_FOUND) } as const;
    default:
      return undefined;
  }
}

/** Cadastro fora do registro é 404, antes de validar corpo ou tocar o banco. */
const resolveVocabulary = createMiddleware<VocabularyEnv>(async (c, next) => {
  const vocabulary = findVocabulary(c.req.param('vocabulary') ?? '');
  if (!vocabulary) return c.json(notFound('Cadastro não encontrado.'), 404);
  c.set('vocabulary', vocabulary.key);
  return next();
});

const manage = () => requirePermission('configuracoes.gerenciar');

export function createSettingsRoutes() {
  return new Hono<VocabularyEnv>()
    .get('/vocabularies', manage(), (c) => {
      const menu: VocabularyMenuItem[] = vocabulariesByLabel().map((vocabulary) => ({
        key: vocabulary.key,
        label: vocabulary.label.plural,
        orderMode: vocabulary.orderMode,
        hasSystemMeaning: false,
      }));
      return c.json(menu, 200);
    })
    .get(
      '/vocabularies/:vocabulary',
      manage(),
      resolveVocabulary,
      zValidator('query', vocabularyListQuerySchema),
      async (c) => {
        const key = c.var.vocabulary;
        const query = c.req.valid('query');
        return c.json(await c.var.withTenant((tx) => listEntries(tx, key, query)), 200);
      },
    )
    .post(
      '/vocabularies/:vocabulary',
      manage(),
      resolveVocabulary,
      zValidator('json', createVocabularyEntrySchema),
      async (c) => {
        const { tenant, userId, vocabulary: key, withTenant } = c.var;
        const input = c.req.valid('json');

        try {
          const result = await withTenant((tx) => createEntry(tx, { tenantId: tenant.id, userId }, key, input));
          if (!result.ok) return c.json(conflict(result.message ?? VOCABULARY_NAME_TAKEN_MESSAGE), 409);
          return c.json(result.entry, 201);
        } catch (error) {
          const refusal = databaseRefusal(error);
          if (!refusal) throw error;
          return c.json(refusal.body, refusal.status);
        }
      },
    )
    .patch(
      '/vocabularies/:vocabulary/:id',
      manage(),
      resolveVocabulary,
      zValidator('json', updateVocabularyEntrySchema),
      async (c) => {
        const { tenant, userId, vocabulary: key, withTenant } = c.var;
        const id = c.req.param('id');
        const input = c.req.valid('json');

        try {
          const result = await withTenant((tx) => updateEntry(tx, { tenantId: tenant.id, userId }, key, id, input));
          if (!result.ok) {
            return result.reason === 'not_found'
              ? c.json(notFound(ENTRY_NOT_FOUND), 404)
              : c.json(conflict(result.message ?? VOCABULARY_NAME_TAKEN_MESSAGE), 409);
          }
          return c.json(result.entry, 200);
        } catch (error) {
          const refusal = databaseRefusal(error);
          if (!refusal) throw error;
          return c.json(refusal.body, refusal.status);
        }
      },
    )
    .delete('/vocabularies/:vocabulary/:id', manage(), resolveVocabulary, async (c) => {
      const { tenant, userId, vocabulary: key, withTenant } = c.var;
      const id = c.req.param('id');

      try {
        const removed = await withTenant((tx) => deleteEntry(tx, { tenantId: tenant.id, userId }, key, id));
        return removed ? c.body(null, 204) : c.json(notFound(ENTRY_NOT_FOUND), 404);
      } catch (error) {
        const refusal = databaseRefusal(error);
        if (!refusal) throw error;
        return c.json(refusal.body, refusal.status);
      }
    });
}
