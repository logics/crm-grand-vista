// Fazenda: o cadastro técnico e comercial do imóvel captado. Aqui moram o
// contrato de API do cadastro mínimo (identificação e áreas), os tipos de lista
// fechada das colunas e a forma que os seletores mostram.
import { z } from 'zod';
import {
  ALQUEIRE_LABELS,
  AREA_FORMAT,
  AREA_SCALE,
  type AlqueireType,
  compareDecimal,
  formatDecimal,
  hectaresToAlqueires,
} from './decimal.js';
import { listPageSchema, listQuerySchema } from './listing.js';
import { COMMERCIAL_STATUS_MEANINGS } from './vocabulary.js';
import { municipalityOptionSchema } from './region.js';

/** Nível: o tipo único das colunas de potencial, prioridade e nota. A tabela as protege por `CHECK` montado desta constante. */
export const LEVELS = ['high', 'medium', 'low'] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_LABELS: Record<Level, string> = { high: 'Alta', medium: 'Média', low: 'Baixa' };

export const levelSchema = z.enum(LEVELS, { error: 'Nível inválido.' });

/** Situação documental da fazenda. */
export const DOCUMENT_STATUSES = ['regular', 'pending', 'irregular'] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  regular: 'Regular',
  pending: 'Pendente',
  irregular: 'Irregular',
};

/** Modo de precificação; nulo na tabela é "sem preço". */
export const PRICING_MODES = ['brl', 'bags'] as const;
export type PricingMode = (typeof PRICING_MODES)[number];

export const PRICING_MODE_LABELS: Record<PricingMode, string> = { brl: 'Em reais', bags: 'Em sacas' };

/** Unidade da avaliação em sacas. */
export const VALUATION_BAGS_UNITS = ['per_hectare', 'per_alqueire'] as const;
export type ValuationBagsUnit = (typeof VALUATION_BAGS_UNITS)[number];

export const VALUATION_BAGS_UNIT_LABELS: Record<ValuationBagsUnit, string> = {
  per_hectare: 'Por hectare',
  per_alqueire: 'Por alqueire',
};

export const FARM_NAME_MAX_LENGTH = 200;

export const FARM_NOT_FOUND_MESSAGE = 'Fazenda não encontrada.';
export const FARM_DELETE_NOT_INACTIVE_MESSAGE = 'Desative a fazenda antes de excluir.';
export const FARM_MUNICIPALITY_UNKNOWN_MESSAGE = 'Município inválido.';
export const FARM_TRADING_POST_UNKNOWN_MESSAGE = 'Praça inválida.';
export const FARM_STATUS_UNKNOWN_MESSAGE = 'Status comercial inválido.';
export const FARM_RESPONSIBLE_UNKNOWN_MESSAGE = 'O corretor responsável precisa ter vínculo com a empresa.';
export const FARM_RESPONSIBLE_FORBIDDEN_MESSAGE = 'Você só pode atribuir fazendas a si mesmo.';
export const FARM_USABLE_AREA_EXCEEDS_TOTAL_MESSAGE = 'A área útil não pode ser maior que a área total.';
export const FARM_NO_DEFAULT_STATUS_MESSAGE = 'Cadastre um status comercial ativo com o significado "Disponível" antes de cadastrar fazendas.';

const AREA_PATTERN = new RegExp(`^\\d{1,8}(\\.\\d{1,${AREA_SCALE}})?$`);

/** Hectares como o `numeric(12,4)` aceita: decimal canônico, até 8 inteiros e 4 casas, maior que zero. */
const areaSchema = (label: 'Área total' | 'Área útil') =>
  z
    .string({ error: `Informe a ${label.toLowerCase()}.` })
    .trim()
    .min(1, `Informe a ${label.toLowerCase()}.`)
    .regex(AREA_PATTERN, `${label} inválida.`)
    // o `refine` roda mesmo com o formato recusado: texto fora do padrão não é comparável
    .refine((value) => !AREA_PATTERN.test(value) || compareDecimal(value, '0') > 0, `${label} deve ser maior que zero.`);

const farmNameSchema = z
  .string({ error: 'Informe o nome.' })
  .trim()
  .min(1, 'Informe o nome.')
  .max(FARM_NAME_MAX_LENGTH, `O nome aceita até ${FARM_NAME_MAX_LENGTH} caracteres.`);

const ibgeCodeSchema = z.string({ error: 'Informe o município.' }).min(1, 'Informe o município.').regex(/^\d{7}$/, FARM_MUNICIPALITY_UNKNOWN_MESSAGE);

/** Área útil acima da total, quando as duas vêm juntas. */
export const usableExceedsTotal = (totalAreaHa: string | undefined, usableAreaHa: string | null | undefined): boolean =>
  totalAreaHa !== undefined &&
  usableAreaHa != null &&
  AREA_PATTERN.test(totalAreaHa) &&
  AREA_PATTERN.test(usableAreaHa) &&
  compareDecimal(usableAreaHa, totalAreaHa) > 0;

const checkAreas = (
  value: { totalAreaHa?: string | undefined; usableAreaHa?: string | null | undefined },
  ctx: z.RefinementCtx,
) => {
  if (usableExceedsTotal(value.totalAreaHa, value.usableAreaHa)) {
    ctx.addIssue({ code: 'custom', path: ['usableAreaHa'], message: FARM_USABLE_AREA_EXCEEDS_TOTAL_MESSAGE });
  }
};

const farmEditableShape = {
  name: farmNameSchema,
  municipalityIbgeCode: ibgeCodeSchema,
  responsibleUserId: z.uuid({ error: 'Corretor responsável inválido.' }),
  tradingPostId: z.uuid({ error: FARM_TRADING_POST_UNKNOWN_MESSAGE }).nullable(),
  commercialStatusId: z.uuid({ error: FARM_STATUS_UNKNOWN_MESSAGE }),
  totalAreaHa: areaSchema('Área total'),
  usableAreaHa: areaSchema('Área útil').nullable(),
};

/**
 * Mínimo para salvar: nome, município, corretor responsável e área total. O
 * corretor responsável ausente é o usuário logado e o status ausente é a
 * entrada padrão de `available` (decididos pela API).
 */
export const createFarmSchema = z
  .object({
    ...farmEditableShape,
    responsibleUserId: farmEditableShape.responsibleUserId.optional(),
    tradingPostId: farmEditableShape.tradingPostId.optional(),
    commercialStatusId: farmEditableShape.commercialStatusId.optional(),
    usableAreaHa: farmEditableShape.usableAreaHa.optional(),
  })
  .superRefine(checkAreas);

/**
 * O mesmo mínimo, como o formulário o valida: lá o corretor responsável é
 * sempre preenchido (padrão: o usuário logado) e limpar o campo é erro de
 * campo obrigatório, não um envio sem ele.
 */
export const farmFormSchema = z
  .object({
    ...farmEditableShape,
    responsibleUserId: z
      .string({ error: 'Informe o corretor responsável.' })
      .min(1, 'Informe o corretor responsável.')
      .pipe(farmEditableShape.responsibleUserId),
    tradingPostId: farmEditableShape.tradingPostId.optional(),
    commercialStatusId: farmEditableShape.commercialStatusId.optional(),
    usableAreaHa: farmEditableShape.usableAreaHa.optional(),
  })
  .superRefine(checkAreas);
export type CreateFarmInput = z.output<typeof createFarmSchema>;

/** Só o que muda. Área útil sem a total no corpo é conferida contra o cadastro (serviço). */
export const updateFarmSchema = z.object(farmEditableShape).partial().superRefine(checkAreas);
export type UpdateFarmInput = z.output<typeof updateFarmSchema>;

const namedReferenceSchema = z.object({ id: z.uuid(), name: z.string() });

/** Fazenda como a API a devolve: referências já com o nome (o do cadastro hoje, ativo ou não). */
export const farmSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  municipality: municipalityOptionSchema,
  responsible: namedReferenceSchema,
  tradingPost: namedReferenceSchema.nullable(),
  commercialStatus: namedReferenceSchema.extend({
    /** O significado de sistema do status (`inactive` é a fazenda desativada). */
    systemMeaning: z.enum(Object.keys(COMMERCIAL_STATUS_MEANINGS) as [keyof typeof COMMERCIAL_STATUS_MEANINGS]),
  }),
  /** Hectares, decimal canônico. */
  totalAreaHa: z.string(),
  usableAreaHa: z.string().nullable(),
  createdAt: z.string(),
});
export type Farm = z.infer<typeof farmSchema>;

export const FARM_SORT_FIELDS = ['createdAt', 'name', 'totalAreaHa'] as const;

/**
 * Status comercial da lista: ids separados por vírgula. Sem o parâmetro, a lista
 * e o total deixam de fora as fazendas de significado `inactive`.
 */
const statusFilterSchema = z
  .string()
  .transform((value) => [...new Set(value.split(',').map((id) => id.trim()))])
  .pipe(z.array(z.uuid({ error: FARM_STATUS_UNKNOWN_MESSAGE })).min(1, FARM_STATUS_UNKNOWN_MESSAGE));

export const farmListQuerySchema = listQuerySchema({
  sortable: FARM_SORT_FIELDS,
  filters: { commercialStatusId: statusFilterSchema.optional() },
});
export type FarmListQuery = z.output<typeof farmListQuerySchema>;

export const farmPageSchema = listPageSchema(farmSchema);

/** Fazenda como a busca a devolve. Área em hectares, decimal canônico (`numeric`, nunca `float`). */
export const farmOptionSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  municipality: municipalityOptionSchema,
  totalAreaHa: z.string().regex(/^\d+(\.\d+)?$/),
});

export type FarmOption = z.infer<typeof farmOptionSchema>;

/** "1.480 ha", "1.480,5 ha": só as casas que a área tem. */
export const formatHectares = (area: string) => `${formatDecimal(area, AREA_FORMAT)} ha`;

/** Área em hectares exibida em alqueires do tipo dado: `"48.4"` vira `"10 alq. goiano"`. */
export const formatAlqueires = (hectares: string, type: AlqueireType) =>
  `${formatDecimal(hectaresToAlqueires(hectares, type), AREA_FORMAT)} ${ALQUEIRE_LABELS[type]}`;

/** Por que uma fazenda é possível duplicata de outra. Vocabulário próprio de fazendas, separado do de contatos. */
export const FARM_DUPLICATE_REASONS = ['name_municipality'] as const;
export type FarmDuplicateReason = (typeof FARM_DUPLICATE_REASONS)[number];

export const FARM_DUPLICATE_REASON_LABELS: Record<FarmDuplicateReason, string> = {
  name_municipality: 'mesmo nome no mesmo município',
};

/**
 * Consulta do aviso de duplicata. Nome ou município ausentes não casam com nada
 * (lista vazia, nunca 400); o município não exige os 7 dígitos: código estranho só não acha nada.
 */
export const farmDuplicatesQuerySchema = z.object({
  name: z.string().trim().optional(),
  municipalityIbgeCode: z.string().trim().optional(),
  excludeId: z.uuid().optional(),
});
export type FarmDuplicatesQuery = z.infer<typeof farmDuplicatesQuerySchema>;

export const farmDuplicateSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  municipality: municipalityOptionSchema,
  reasons: z.array(z.enum(FARM_DUPLICATE_REASONS)),
});
export type FarmDuplicate = z.infer<typeof farmDuplicateSchema>;
