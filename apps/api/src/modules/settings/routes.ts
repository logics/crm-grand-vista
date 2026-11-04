// Rotas de Configurações, montadas sob `/e/:tenant/settings`. Os cadastros
// auxiliares são um conjunto de rotas só, parametrizado pela chave do registro
// de `@crm/shared`.
import {
  createVocabularyEntrySchema,
  reorderVocabularySchema,
  findVocabulary,
  vocabularyMeaningRequiredMessage,
  vocabularyMeaningUnexpectedMessage,
  tradingPostSuggestionQuerySchema,
  VOCABULARY_MUNICIPALITIES_UNEXPECTED_MESSAGE,
  VOCABULARY_MUNICIPALITY_TAKEN_MESSAGE,
  updateTenantSettingsSchema,
  updateVocabularyEntrySchema,
  VOCABULARY_IN_USE_MESSAGE,
  VOCABULARY_NAME_TAKEN_MESSAGE,
  vocabulariesByLabel,
  vocabularyListQuerySchema,
  vocabularyOptionsQuerySchema,
  type VocabularyKey,
  type VocabularyMenuItem,
} from '@crm/shared';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { noPermissionRequired, requirePermission } from '../../authorization/route-access.js';
import { readTenantSettings, updateTenantSettings } from './parameters.js';
import { suggestTradingPost } from './trading-post-municipalities.js';
import type { TenantEnv } from '../../tenant-context.js';
import { createEntry, defaultEntries, deleteEntry, listEntries, listOptions, reorderEntries, updateEntry } from './service.js';

interface VocabularyEnv extends TenantEnv {
  Variables: TenantEnv['Variables'] & { vocabulary: VocabularyKey };
}

const notFound = (message: string) => ({ error: { code: 'not_found', message } });
const validationError = (message: string) => ({ error: { code: 'validation_error', message } });
const conflict = (message: string) => ({ error: { code: 'conflict', message } });

/** Código SQLSTATE do erro do driver, que o Drizzle embrulha em `cause`. */
function sqlState(error: unknown): string | undefined {
  for (let current = error; current instanceof Error; current = current.cause) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) return code;
  }
  return undefined;
}

/** Nome da constraint que o driver aponta no erro, quando há. */
function violatedConstraint(error: unknown): string | undefined {
  for (let current = error; current instanceof Error; current = current.cause) {
    const constraint = (current as { constraint?: unknown }).constraint;
    if (typeof constraint === 'string') return constraint;
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
      // Duas praças gravando o mesmo município ao mesmo tempo: o UNIQUE do município, não o do nome.
      return violatedConstraint(error)?.startsWith('trading_post_municipalities')
        ? ({ status: 409, body: conflict(VOCABULARY_MUNICIPALITY_TAKEN_MESSAGE) } as const)
        : ({ status: 409, body: conflict(VOCABULARY_NAME_TAKEN_MESSAGE) } as const);
    case SQLSTATE.restrictViolation:
    case SQLSTATE.foreignKeyViolation:
      return { status: 409, body: conflict(VOCABULARY_IN_USE_MESSAGE) } as const;
    case SQLSTATE.invalidText:
      return { status: 404, body: notFound(ENTRY_NOT_FOUND) } as const;
    default:
      return undefined;
  }
}

/** Resposta da recusa de uma escrita: 400 para o que é inválido, 409 para o que a regra recusa. */
function refusalResponse(result: { reason: string; message?: string }) {
  return result.reason === 'invalid'
    ? ({ status: 400, body: validationError(result.message ?? '') } as const)
    : ({ status: 409, body: conflict(result.message ?? VOCABULARY_NAME_TAKEN_MESSAGE) } as const);
}

/** Municípios atendidos só valem em cadastro que os tem. */
const unexpectedMunicipalities = (key: VocabularyKey, municipalities: unknown) =>
  municipalities !== undefined && !findVocabulary(key)?.servedMunicipalities;

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
    // leitura de apoio: basta o vínculo com a empresa
    .get('/', noPermissionRequired, async (c) => c.json(await c.var.withTenant(readTenantSettings), 200))
    .patch('/', manage(), zValidator('json', updateTenantSettingsSchema), async (c) => {
      const { tenant, userId, withTenant } = c.var;
      const input = c.req.valid('json');
      return c.json(await withTenant((tx) => updateTenantSettings(tx, { tenantId: tenant.id, userId }, input)), 200);
    })
    .get('/vocabularies', manage(), (c) => {
      const menu: VocabularyMenuItem[] = vocabulariesByLabel().map((vocabulary) => ({
        key: vocabulary.key,
        label: vocabulary.label.plural,
        orderMode: vocabulary.orderMode,
        hasSystemMeaning: vocabulary.systemMeaning !== undefined,
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
    .get(
      '/vocabularies/:vocabulary/options',
      // leitura de apoio: basta o vínculo com a empresa, que o roteador do tenant já exige
      noPermissionRequired,
      resolveVocabulary,
      zValidator('query', vocabularyOptionsQuerySchema),
      async (c) => {
        const key = c.var.vocabulary;
        const query = c.req.valid('query');
        return c.json(await c.var.withTenant((tx) => listOptions(tx, key, query)), 200);
      },
    )
    .get(
      '/vocabularies/:vocabulary/defaults',
      // leitura de apoio: basta o vínculo com a empresa
      noPermissionRequired,
      resolveVocabulary,
      async (c) => {
        const key = c.var.vocabulary;
        return c.json(await c.var.withTenant((tx) => defaultEntries(tx, key)), 200);
      },
    )
    .get(
      '/trading-posts/suggestion',
      // leitura de apoio: basta o vínculo com a empresa
      noPermissionRequired,
      zValidator('query', tradingPostSuggestionQuerySchema),
      async (c) => {
        const { municipality } = c.req.valid('query');
        return c.json(await c.var.withTenant((tx) => suggestTradingPost(tx, municipality)), 200);
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

        // O significado vale só em cadastro que o tem, e de lista fechada.
        const meanings = findVocabulary(key)?.systemMeaning?.options;
        if (meanings && (input.systemMeaning === undefined || !Object.hasOwn(meanings, input.systemMeaning))) {
          return c.json(validationError(vocabularyMeaningRequiredMessage), 400);
        }
        if (!meanings && input.systemMeaning !== undefined) {
          return c.json(validationError(vocabularyMeaningUnexpectedMessage), 400);
        }

        if (unexpectedMunicipalities(key, input.municipalities)) {
          return c.json(validationError(VOCABULARY_MUNICIPALITIES_UNEXPECTED_MESSAGE), 400);
        }

        try {
          const result = await withTenant((tx) => createEntry(tx, { tenantId: tenant.id, userId }, key, input));
          if (!result.ok) {
            const refusal = refusalResponse(result);
            return c.json(refusal.body, refusal.status);
          }
          return c.json(result.entry, 201);
        } catch (error) {
          const refusal = databaseRefusal(error);
          if (!refusal) throw error;
          return c.json(refusal.body, refusal.status);
        }
      },
    )
    .put(
      '/vocabularies/:vocabulary/order',
      manage(),
      resolveVocabulary,
      zValidator('json', reorderVocabularySchema),
      async (c) => {
        const { tenant, userId, vocabulary: key, withTenant } = c.var;
        const { ids } = c.req.valid('json');
        const result = await withTenant((tx) => reorderEntries(tx, { tenantId: tenant.id, userId }, key, ids));
        return result.ok ? c.body(null, 204) : c.json(validationError(result.message), 400);
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

        if (unexpectedMunicipalities(key, input.municipalities)) {
          return c.json(validationError(VOCABULARY_MUNICIPALITIES_UNEXPECTED_MESSAGE), 400);
        }

        try {
          const result = await withTenant((tx) => updateEntry(tx, { tenantId: tenant.id, userId }, key, id, input));
          if (!result.ok) {
            if (result.reason === 'not_found') return c.json(notFound(ENTRY_NOT_FOUND), 404);
            const refusal = refusalResponse(result);
            return c.json(refusal.body, refusal.status);
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
        if (typeof removed === 'object') return c.json(conflict(removed.refused), 409);
        return removed ? c.body(null, 204) : c.json(notFound(ENTRY_NOT_FOUND), 404);
      } catch (error) {
        const refusal = databaseRefusal(error);
        if (!refusal) throw error;
        return c.json(refusal.body, refusal.status);
      }
    });
}
