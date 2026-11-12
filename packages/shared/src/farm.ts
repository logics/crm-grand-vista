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
import { municipalityOptionSchema } from './region.js';
import { optionalText } from './text.js';

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
export const FARM_LONG_TEXT_MAX_LENGTH = 10_000;

export const FARM_NOT_FOUND_MESSAGE = 'Fazenda não encontrada.';
export const FARM_MUNICIPALITY_UNKNOWN_MESSAGE = 'Município inválido.';
export const FARM_TRADING_POST_UNKNOWN_MESSAGE = 'Praça inválida.';
export const FARM_STATUS_UNKNOWN_MESSAGE = 'Status comercial inválido.';
export const FARM_RESPONSIBLE_UNKNOWN_MESSAGE = 'O corretor responsável precisa ter vínculo com a empresa.';
export const FARM_RESPONSIBLE_FORBIDDEN_MESSAGE = 'Você só pode atribuir fazendas a si mesmo.';
export const FARM_USABLE_AREA_EXCEEDS_TOTAL_MESSAGE = 'A área útil não pode ser maior que a área total.';
export const FARM_APTITUDE_UNKNOWN_MESSAGE = 'Aptidão inválida.';
export const FARM_CROP_UNKNOWN_MESSAGE = 'Cultura inválida.';
export const FARM_COORDINATES_PAIR_MESSAGE = 'Informe a latitude e a longitude juntas.';
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

/** Coordenadas como o `numeric(10,7)` as aceita: decimal canônico, até 3 inteiros e 7 casas. */
const COORDINATE_PATTERN = /^-?\d{1,3}(\.\d{1,7})?$/;
const DISTANCE_PATTERN = /^\d{1,6}(\.\d{1,2})?$/;

/** Distância em km como o `numeric(8,2)` aceita; o `CHECK` de ≥ 0 já sai da forma (sem sinal). */
const distanceSchema = (label: string) =>
  z.string({ error: `${label} inválida.` }).trim().regex(DISTANCE_PATTERN, `${label} inválida.`).nullable();

const coordinateSchema = (label: 'Latitude' | 'Longitude', limit: number) =>
  z
    .string({ error: `${label} inválida.` })
    .trim()
    .regex(COORDINATE_PATTERN, `${label} inválida.`)
    .refine(
      (value) => !COORDINATE_PATTERN.test(value) || (compareDecimal(value, String(-limit)) >= 0 && compareDecimal(value, String(limit)) <= 0),
      `${label} deve ficar entre -${limit} e ${limit}.`,
    )
    .nullable();

/** Uma ou nenhuma das duas coordenadas é erro de campo, no que falta. */
const coordinatesPairIssue = (latitude: string | null, longitude: string | null, ctx: z.RefinementCtx) => {
  if ((latitude === null) !== (longitude === null)) {
    ctx.addIssue({ code: 'custom', path: [latitude === null ? 'latitude' : 'longitude'], message: FARM_COORDINATES_PAIR_MESSAGE });
  }
};

/** Na criação, coordenada ausente é coordenada nula. */
const checkCoordinates = (
  value: { latitude?: string | null | undefined; longitude?: string | null | undefined },
  ctx: z.RefinementCtx,
) => coordinatesPairIssue(value.latitude ?? null, value.longitude ?? null, ctx);

/** Na edição, só o par enviado junto; um lado só é conferido contra o cadastro (serviço). */
const checkCoordinatesSent = (
  value: { latitude?: string | null | undefined; longitude?: string | null | undefined },
  ctx: z.RefinementCtx,
) => {
  if (value.latitude !== undefined && value.longitude !== undefined) coordinatesPairIssue(value.latitude, value.longitude, ctx);
};

const uniqueIds = (message: string) =>
  z.array(z.uuid({ error: message }), { error: message }).transform((ids) => [...new Set(ids)]);

const longText = (label: string) => optionalText(FARM_LONG_TEXT_MAX_LENGTH, label);

const farmEditableShape = {
  name: farmNameSchema,
  municipalityIbgeCode: ibgeCodeSchema,
  responsibleUserId: z.uuid({ error: 'Corretor responsável inválido.' }),
  tradingPostId: z.uuid({ error: FARM_TRADING_POST_UNKNOWN_MESSAGE }).nullable(),
  commercialStatusId: z.uuid({ error: FARM_STATUS_UNKNOWN_MESSAGE }),
  totalAreaHa: areaSchema('Área total'),
  usableAreaHa: areaSchema('Área útil').nullable(),
  salesPotential: levelSchema.nullable(),
  priority: levelSchema.nullable(),
  waterAvailability: levelSchema.nullable(),
  irrigationPotential: levelSchema.nullable(),
  productivePotential: levelSchema.nullable(),
  distanceToHighwayKm: distanceSchema('Distância até a rodovia'),
  distanceToWarehouseKm: distanceSchema('Distância até o armazém'),
  documentStatus: z.enum(DOCUMENT_STATUSES, { error: 'Situação documental inválida.' }).nullable(),
  documentNotes: longText('A observação documental'),
  soil: longText('O solo'),
  topography: longText('A topografia'),
  water: longText('A água'),
  historicalProductivity: longText('A produtividade histórica'),
  infrastructure: longText('A infraestrutura'),
  technicalSummary: longText('O resumo técnico'),
  differentials: longText('Os diferenciais'),
  latitude: coordinateSchema('Latitude', 90),
  longitude: coordinateSchema('Longitude', 180),
  /** Se presentes, substituem o conjunto de aptidões/culturas da fazenda. */
  aptitudeIds: uniqueIds(FARM_APTITUDE_UNKNOWN_MESSAGE),
  cropIds: uniqueIds(FARM_CROP_UNKNOWN_MESSAGE),
};

/** Tudo o que é opcional ao criar: a ausência é "não informado" (ou conjunto vazio). */
const optionalOnCreate = {
  salesPotential: farmEditableShape.salesPotential.optional(),
  priority: farmEditableShape.priority.optional(),
  waterAvailability: farmEditableShape.waterAvailability.optional(),
  irrigationPotential: farmEditableShape.irrigationPotential.optional(),
  productivePotential: farmEditableShape.productivePotential.optional(),
  distanceToHighwayKm: farmEditableShape.distanceToHighwayKm.optional(),
  distanceToWarehouseKm: farmEditableShape.distanceToWarehouseKm.optional(),
  documentStatus: farmEditableShape.documentStatus.optional(),
  documentNotes: farmEditableShape.documentNotes.optional(),
  soil: farmEditableShape.soil.optional(),
  topography: farmEditableShape.topography.optional(),
  water: farmEditableShape.water.optional(),
  historicalProductivity: farmEditableShape.historicalProductivity.optional(),
  infrastructure: farmEditableShape.infrastructure.optional(),
  technicalSummary: farmEditableShape.technicalSummary.optional(),
  differentials: farmEditableShape.differentials.optional(),
  latitude: farmEditableShape.latitude.optional(),
  longitude: farmEditableShape.longitude.optional(),
  aptitudeIds: farmEditableShape.aptitudeIds.optional(),
  cropIds: farmEditableShape.cropIds.optional(),
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
    ...optionalOnCreate,
  })
  .superRefine(checkAreas)
  .superRefine(checkCoordinates);

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
    ...optionalOnCreate,
  })
  .superRefine(checkAreas)
  .superRefine(checkCoordinates);
export type CreateFarmInput = z.output<typeof createFarmSchema>;

/** Só o que muda. Área útil sem a total no corpo é conferida contra o cadastro (serviço). */
export const updateFarmSchema = z.object(farmEditableShape).partial().superRefine(checkAreas).superRefine(checkCoordinatesSent);
export type UpdateFarmInput = z.output<typeof updateFarmSchema>;

const namedReferenceSchema = z.object({ id: z.uuid(), name: z.string() });

/** Fazenda como a API a devolve: referências já com o nome (o do cadastro hoje, ativo ou não). */
export const farmSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  municipality: municipalityOptionSchema,
  responsible: namedReferenceSchema,
  tradingPost: namedReferenceSchema.nullable(),
  commercialStatus: namedReferenceSchema,
  /** Hectares, decimal canônico. */
  totalAreaHa: z.string(),
  usableAreaHa: z.string().nullable(),
  salesPotential: levelSchema.nullable(),
  priority: levelSchema.nullable(),
  waterAvailability: levelSchema.nullable(),
  irrigationPotential: levelSchema.nullable(),
  productivePotential: levelSchema.nullable(),
  /** Quilômetros, decimal canônico. */
  distanceToHighwayKm: z.string().nullable(),
  distanceToWarehouseKm: z.string().nullable(),
  documentStatus: z.enum(DOCUMENT_STATUSES).nullable(),
  documentNotes: z.string().nullable(),
  soil: z.string().nullable(),
  topography: z.string().nullable(),
  water: z.string().nullable(),
  historicalProductivity: z.string().nullable(),
  infrastructure: z.string().nullable(),
  technicalSummary: z.string().nullable(),
  differentials: z.string().nullable(),
  /** Graus decimais; as duas ou nenhuma. */
  latitude: z.string().nullable(),
  longitude: z.string().nullable(),
  /** Por nome (de hoje, ativa ou não). */
  aptitudes: z.array(namedReferenceSchema),
  crops: z.array(namedReferenceSchema),
  createdAt: z.string(),
});
export type Farm = z.infer<typeof farmSchema>;

export const FARM_SORT_FIELDS = ['createdAt', 'name', 'totalAreaHa'] as const;

export const farmListQuerySchema = listQuerySchema({ sortable: FARM_SORT_FIELDS });
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
