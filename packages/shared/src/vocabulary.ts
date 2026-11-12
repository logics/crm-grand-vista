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
  /** Máximo de entradas do cadastro; sem limite quando ausente. Ordem de fluxo é curta. */
  maxEntries?: number;
  /**
   * Significado de sistema: a entrada carrega um valor de lista fechada que o
   * código lê (`sold`), enquanto o nome é livre. `noun` completa as mensagens
   * ("ao menos um **status** ativo").
   */
  systemMeaning?: { noun: string; options: Readonly<Record<string, string>> };
  /**
   * Tabelas de campo extra do próprio cadastro (ex.: `trading_post_municipalities`
   * de `trading_posts`): a única exceção à regra de que toda FK para um cadastro
   * é `ON DELETE RESTRICT`. A exceção mora aqui, nunca numa lista solta no teste.
   */
  extraFieldTables?: readonly string[];
  /**
   * Campo extra "Municípios atendidos" (`trading_post_municipalities`): a entrada
   * traz os municípios e grava-os junto com o nome, num save só.
   */
  servedMunicipalities?: true;
}

/** Significados de sistema do status comercial e o rótulo de exibição de cada um. */
export const COMMERCIAL_STATUS_MEANINGS = {
  available: 'Disponível',
  negotiating: 'Em negociação',
  sold: 'Vendida',
  suspended: 'Suspensa',
  inactive: 'Desativada',
} as const;

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
  'trading-posts': {
    key: 'trading-posts',
    table: 'trading_posts',
    label: { singular: 'Praça', plural: 'Praças' },
    gender: 'f',
    orderMode: 'alphabetical',
    extraFieldTables: ['trading_post_municipalities'],
    servedMunicipalities: true,
  },
  crops: {
    key: 'crops',
    table: 'crops',
    label: { singular: 'Cultura', plural: 'Culturas' },
    gender: 'f',
    orderMode: 'alphabetical',
  },
  'commercial-statuses': {
    key: 'commercial-statuses',
    table: 'commercial_statuses',
    label: { singular: 'Status comercial', plural: 'Status comercial' },
    gender: 'm',
    orderMode: 'manual',
    maxEntries: 50,
    systemMeaning: { noun: 'status', options: COMMERCIAL_STATUS_MEANINGS },
  },
} as const satisfies Record<string, VocabularyDefinition>;

export type VocabularyKey = keyof typeof VOCABULARIES;

export const VOCABULARY_KEYS = Object.keys(VOCABULARIES) as VocabularyKey[];

/** Cadastro do registro, em forma mais larga que a literal, para ler campos opcionais. */
export type AnyVocabulary = VocabularyDefinition & { key: VocabularyKey };

/** O cadastro da chave da URL, ou nulo se ela está fora do registro (404). */
export function findVocabulary(key: string): AnyVocabulary | null {
  return Object.hasOwn(VOCABULARIES, key) ? VOCABULARIES[key as VocabularyKey] : null;
}

/** Os cadastros do registro em ordem alfabética do rótulo: a ordem do menu. */
export function vocabulariesByLabel(): AnyVocabulary[] {
  return (Object.values(VOCABULARIES) as AnyVocabulary[]).sort((left, right) =>
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

/** Máximo de municípios atendidos por praça: folga larga sobre o que uma praça real abrange. */
export const VOCABULARY_MUNICIPALITIES_MAX = 500;

/** Códigos IBGE dos municípios atendidos; repetido conta uma vez. Só vale em cadastro que os tem (a rota confere). */
export const servedMunicipalitiesSchema = z
  .array(z.string().regex(/^\d{7}$/, 'Código de município inválido.'))
  .max(VOCABULARY_MUNICIPALITIES_MAX, `Uma praça atende até ${VOCABULARY_MUNICIPALITIES_MAX} municípios.`)
  .transform((codes) => [...new Set(codes)]);

/** Corpo do `POST`. O significado e os municípios valem só em cadastro que os tem: a rota confere contra o registro. */
export const createVocabularyEntrySchema = z.object({
  name: vocabularyNameSchema,
  systemMeaning: z.string().optional(),
  municipalities: servedMunicipalitiesSchema.optional(),
});

export type CreateVocabularyEntryInput = z.infer<typeof createVocabularyEntrySchema>;

/** Corpo do `PATCH`: renomear e/ou desativar e reativar. Chave não declarada é descartada. */
export const updateVocabularyEntrySchema = z
  .object({
    name: vocabularyNameSchema,
    active: z.boolean(),
    // Ausente preserva os municípios; a lista (mesmo vazia) os substitui.
    municipalities: servedMunicipalitiesSchema,
    // O significado é escolhido só na criação: qualquer valor aqui é 400.
    systemMeaning: z.never('O significado não pode ser alterado depois de criado.'),
  })
  .partial();

export type UpdateVocabularyEntryInput = z.infer<typeof updateVocabularyEntrySchema>;

/** Corpo do `PUT /order`: a lista completa de ids na nova ordem. */
export const reorderVocabularySchema = z.object({ ids: z.array(z.uuid()) });

export type ReorderVocabularyInput = z.infer<typeof reorderVocabularySchema>;

/** Recusa da reordenação cuja lista não é exatamente a das entradas do cadastro. */
export const VOCABULARY_REORDER_MISMATCH_MESSAGE =
  'A lista precisa ter todas as entradas do cadastro, cada uma uma só vez.';

/** Recusa da reordenação de cadastro alfabético. */
export const VOCABULARY_NOT_MANUAL_MESSAGE = 'Este cadastro é ordenado por nome e não pode ser reordenado.';

export const VOCABULARY_STATUSES = ['active', 'inactive', 'all'] as const;

export type VocabularyStatus = (typeof VOCABULARY_STATUSES)[number];

/** Parâmetros da listagem de administração: o mesmo schema na rota e na URL do front. */
export const vocabularyListQuerySchema = listQuerySchema({
  sortable: ['name'],
  filters: { status: z.enum(VOCABULARY_STATUSES).default('all') },
});

export type VocabularyListQuery = z.output<typeof vocabularyListQuerySchema>;

/** Município atendido, como a resposta da praça o traz. */
export const servedMunicipalitySchema = z.object({ ibgeCode: z.string(), name: z.string(), uf: z.string() });

export type ServedMunicipality = z.infer<typeof servedMunicipalitySchema>;

export const vocabularyEntrySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  active: z.boolean(),
  /** Só nos cadastros com significado de sistema. */
  systemMeaning: z.string().optional(),
  /** Só nos cadastros com municípios atendidos (a praça), nas respostas de entrada. */
  municipalities: z.array(servedMunicipalitySchema).optional(),
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
export function serializeVocabularyEntry(entry: {
  id: string;
  name: string;
  active: boolean;
  systemMeaning?: string | null;
  municipalities?: ServedMunicipality[];
}): VocabularyEntry {
  return vocabularyEntrySchema.parse({
    id: entry.id,
    name: entry.name,
    active: entry.active,
    ...(entry.systemMeaning ? { systemMeaning: entry.systemMeaning } : {}),
    ...(entry.municipalities ? { municipalities: entry.municipalities } : {}),
  });
}

/** Resposta de `/defaults`: a primeira entrada ativa de cada significado, ou nulo se não há. */
export const vocabularyDefaultsSchema = z.record(z.string(), z.object({ id: z.uuid(), name: z.string() }).nullable());

export type VocabularyDefaults = z.infer<typeof vocabularyDefaultsSchema>;

export const vocabularyMaxEntriesMessage = (vocabulary: VocabularyDefinition) =>
  `O limite é de ${vocabulary.maxEntries} entradas em ${vocabulary.label.plural.toLowerCase()}.`;

export const vocabularyMeaningRequiredMessage = 'Escolha o significado.';
export const vocabularyMeaningUnexpectedMessage = 'Este cadastro não tem significado.';

/** "Precisa haver ao menos um status ativo com o significado Vendida." */
export function lastActiveMeaningMessage(vocabulary: VocabularyDefinition, meaning: string): string {
  const { noun, options } = vocabulary.systemMeaning ?? { noun: 'entrada', options: {} };
  const article = vocabulary.gender === 'f' ? 'uma' : 'um';
  const active = vocabulary.gender === 'f' ? 'ativa' : 'ativo';
  return `Precisa haver ao menos ${article} ${noun} ${active} com o significado ${options[meaning] ?? meaning}.`;
}

export const VOCABULARY_NAME_TAKEN_MESSAGE = 'Já existe uma entrada com esse nome.';
export const VOCABULARY_NAME_TAKEN_INACTIVE_MESSAGE = 'Já existe uma entrada inativa com esse nome; reative-a.';
export const VOCABULARY_IN_USE_MESSAGE =
  'Esta entrada está em uso. Desative-a para que não apareça em novos cadastros.';

export const VOCABULARY_MUNICIPALITIES_UNEXPECTED_MESSAGE = 'Este cadastro não tem municípios atendidos.';
export const VOCABULARY_MUNICIPALITY_UNKNOWN_MESSAGE = 'Há município que não existe na lista do IBGE.';
export const VOCABULARY_MUNICIPALITY_TAKEN_MESSAGE = 'Há município já atendido por outra praça.';

/** "Rio Verde — GO já é atendido pela praça Jataí." */
export const municipalityTakenMessage = (municipality: string, tradingPost: string) =>
  `${municipality} já é atendido pela praça ${tradingPost}.`;

/** Resposta de `GET /trading-posts/suggestion`. */
export const tradingPostSuggestionSchema = z.object({
  tradingPost: z.object({ id: z.uuid(), name: z.string() }).nullable(),
});

export type TradingPostSuggestion = z.infer<typeof tradingPostSuggestionSchema>;

/** Parâmetro da sugestão: o código IBGE do município. */
export const tradingPostSuggestionQuerySchema = z.object({
  municipality: z.string().regex(/^\d{7}$/, 'Informe o código IBGE do município.'),
});
