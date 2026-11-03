// Cadastros auxiliares (`vocabulary`, só o identificador em código; na tela,
// "Cadastros auxiliares"): listas de apoio que cada empresa mantém, como as
// culturas. Este registro é o ponto único de extensão — a rota, a tela e o menu
// leem daqui, e um cadastro novo é uma entrada neste registro mais a migration
// da tabela, sem tocar rota nem tela.
import { z } from 'zod';
import type { GrammaticalGender } from './field-metadata.js';
import { listPageSchema, listQuerySchema } from './listing.js';

/** `alphabetical`: pelo nome (collation pt-BR); `manual`: pela ordem que o gestor define. */
export type VocabularyOrderMode = 'alphabetical' | 'manual';

export interface VocabularyDefinition {
  /** Chave na URL: `/e/<empresa>/settings/vocabularies/<key>`. */
  key: string;
  /** Nome da tabela, o mesmo de `FIELD_REGISTRY` e do `entity` do `audit_log`. */
  table: string;
  /** Rótulo no singular e no plural ("Cultura", "Culturas"). */
  label: { singular: string; plural: string };
  /** Gênero do rótulo, para a concordância dos textos ("Nova cultura", "Novo status"). */
  gender: GrammaticalGender;
  orderMode: VocabularyOrderMode;
  /**
   * Tabelas de campo extra do próprio cadastro (ex.: `trading_post_municipalities`
   * de `trading_posts`): a única exceção à regra de que toda FK para um cadastro
   * é `ON DELETE RESTRICT`. A exceção mora aqui, nunca numa lista solta no teste.
   */
  extraFieldTables?: readonly string[];
}

export const VOCABULARIES = {
  aptitudes: {
    key: 'aptitudes',
    table: 'aptitudes',
    label: { singular: 'Aptidão', plural: 'Aptidões' },
    gender: 'f',
    orderMode: 'alphabetical',
  },
  'contact-classifications': {
    key: 'contact-classifications',
    table: 'contact_classifications',
    label: { singular: 'Classificação do cliente', plural: 'Classificações do cliente' },
    gender: 'f',
    orderMode: 'alphabetical',
  },
  'document-categories': {
    key: 'document-categories',
    table: 'document_categories',
    label: { singular: 'Categoria de documento', plural: 'Categorias de documento' },
    gender: 'f',
    orderMode: 'alphabetical',
  },
  'lead-sources': {
    key: 'lead-sources',
    table: 'lead_sources',
    label: { singular: 'Origem do lead', plural: 'Origens do lead' },
    gender: 'f',
    orderMode: 'alphabetical',
  },
  'payment-methods': {
    key: 'payment-methods',
    table: 'payment_methods',
    label: { singular: 'Forma de pagamento', plural: 'Formas de pagamento' },
    gender: 'f',
    orderMode: 'alphabetical',
  },
  'purchase-profiles': {
    key: 'purchase-profiles',
    table: 'purchase_profiles',
    label: { singular: 'Perfil de compra', plural: 'Perfis de compra' },
    gender: 'm',
    orderMode: 'alphabetical',
  },
  crops: {
    key: 'crops',
    table: 'crops',
    label: { singular: 'Cultura', plural: 'Culturas' },
    gender: 'f',
    orderMode: 'alphabetical',
  },
} as const satisfies Record<string, VocabularyDefinition>;

export type VocabularyKey = keyof typeof VOCABULARIES;

export const VOCABULARY_KEYS = Object.keys(VOCABULARIES) as VocabularyKey[];

/** O cadastro da chave da URL, ou nulo se ela está fora do registro (404). */
export function findVocabulary(key: string): (typeof VOCABULARIES)[VocabularyKey] | null {
  return Object.hasOwn(VOCABULARIES, key) ? VOCABULARIES[key as VocabularyKey] : null;
}

/** Os cadastros do registro em ordem alfabética do rótulo: a ordem do menu. */
export function vocabulariesByLabel(): (typeof VOCABULARIES)[VocabularyKey][] {
  return Object.values(VOCABULARIES).sort((left, right) =>
    left.label.plural.localeCompare(right.label.plural, 'pt-BR'),
  );
}

export const VOCABULARY_NAME_MAX_LENGTH = 100;

/** Nome da entrada: obrigatório, sem espaços nas pontas, até 100 caracteres. */
export const vocabularyNameSchema = z
  .string('Informe o nome.')
  .trim()
  .min(1, 'Informe o nome.')
  .max(VOCABULARY_NAME_MAX_LENGTH, `O nome aceita até ${VOCABULARY_NAME_MAX_LENGTH} caracteres.`);

export const createVocabularyEntrySchema = z.object({ name: vocabularyNameSchema });

export type CreateVocabularyEntryInput = z.infer<typeof createVocabularyEntrySchema>;

/** Corpo do `PATCH`: renomear e/ou desativar e reativar. Chave não declarada é descartada. */
export const updateVocabularyEntrySchema = z
  .object({ name: vocabularyNameSchema, active: z.boolean() })
  .partial();

export type UpdateVocabularyEntryInput = z.infer<typeof updateVocabularyEntrySchema>;

export const VOCABULARY_STATUSES = ['active', 'inactive', 'all'] as const;

export type VocabularyStatus = (typeof VOCABULARY_STATUSES)[number];

/** Parâmetros da listagem de administração: o mesmo schema na rota e na URL do front. */
export const vocabularyListQuerySchema = listQuerySchema({
  sortable: ['name'],
  filters: { status: z.enum(VOCABULARY_STATUSES).default('all') },
});

export type VocabularyListQuery = z.output<typeof vocabularyListQuerySchema>;

export const vocabularyEntrySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  active: z.boolean(),
});

export type VocabularyEntry = z.infer<typeof vocabularyEntrySchema>;

export const vocabularyEntryPageSchema = listPageSchema(vocabularyEntrySchema);

/** Item do menu de Configurações. */
export const vocabularyMenuItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  orderMode: z.enum(['alphabetical', 'manual']),
  hasSystemMeaning: z.boolean(),
});

export type VocabularyMenuItem = z.infer<typeof vocabularyMenuItemSchema>;

/** Tamanho padrão e máximo da página de opções do seletor. */
export const VOCABULARY_OPTIONS_PAGE_SIZE = 30;
export const VOCABULARY_OPTIONS_MAX_PAGE_SIZE = 100;

/**
 * Parâmetros de `/options`: busca, paginação por cursor opaco, inativas e
 * hidratação por ids. `ids` chega como lista separada por vírgula.
 */
export const vocabularyOptionsQuerySchema = z.object({
  q: z.string().trim().max(VOCABULARY_NAME_MAX_LENGTH).optional(),
  cursor: z.string().regex(/^\d{1,9}$/, 'Cursor inválido.').optional(),
  limit: z.coerce.number().int().min(1).max(VOCABULARY_OPTIONS_MAX_PAGE_SIZE).default(VOCABULARY_OPTIONS_PAGE_SIZE),
  includeInactive: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  ids: z
    .string()
    .optional()
    .transform((value) => (value ? value.split(',').filter((id) => id !== '') : []))
    .pipe(z.array(z.uuid()).max(VOCABULARY_OPTIONS_MAX_PAGE_SIZE)),
});

export type VocabularyOptionsQuery = z.output<typeof vocabularyOptionsQuerySchema>;

/** Uma opção do seletor: o que basta para escolher e exibir uma entrada. */
export type VocabularyOption = VocabularyEntry;

export const vocabularyOptionsPageSchema = z.object({
  items: z.array(vocabularyEntrySchema),
  nextCursor: z.string().optional(),
});

export type VocabularyOptionsPage = z.infer<typeof vocabularyOptionsPageSchema>;

/** Só o que sai pela borda HTTP: nenhuma coluna a mais da tabela atravessa. */
export function serializeVocabularyEntry(entry: { id: string; name: string; active: boolean }): VocabularyEntry {
  return vocabularyEntrySchema.parse({ id: entry.id, name: entry.name, active: entry.active });
}

export const VOCABULARY_NAME_TAKEN_MESSAGE = 'Já existe uma entrada com esse nome.';
export const VOCABULARY_NAME_TAKEN_INACTIVE_MESSAGE = 'Já existe uma entrada inativa com esse nome; reative-a.';
export const VOCABULARY_IN_USE_MESSAGE =
  'Esta entrada está em uso. Desative-a para que não apareça em novos cadastros.';
