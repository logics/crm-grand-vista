// Fazenda: o cadastro técnico e comercial do imóvel captado. Aqui moram o
// contrato de API do cadastro mínimo (identificação e áreas), os tipos de lista
// fechada das colunas e a forma que os seletores mostram.
import { z } from 'zod';
import {
  ALQUEIRE_HECTARES,
  ALQUEIRE_LABELS,
  ALQUEIRE_TYPES,
  AREA_FORMAT,
  AREA_SCALE,
  MONEY_SCALE,
  type AlqueireType,
  compareDecimal,
  divideDecimal,
  formatDecimal,
  formatMoney,
  hectaresToAlqueires,
  roundDecimal,
} from './decimal.js';
import { listPageSchema, listQuerySchema } from './listing.js';
import { COMMERCIAL_STATUS_MEANINGS } from './vocabulary.js';
import { UFS, municipalityOptionSchema } from './region.js';
import { referralChainInputSchema, referralChainOutputSchema } from './referral-chain.js';
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
export const FARM_DELETE_NOT_INACTIVE_MESSAGE = 'Desative a fazenda antes de excluir.';
export const FARM_MUNICIPALITY_UNKNOWN_MESSAGE = 'Município inválido.';
export const FARM_TRADING_POST_UNKNOWN_MESSAGE = 'Praça inválida.';
export const FARM_STATUS_UNKNOWN_MESSAGE = 'Status comercial inválido.';
export const FARM_RESPONSIBLE_UNKNOWN_MESSAGE = 'O corretor responsável precisa ter vínculo com a empresa.';
export const FARM_RESPONSIBLE_FORBIDDEN_MESSAGE = 'Você só pode atribuir fazendas a si mesmo.';
export const FARM_USABLE_AREA_EXCEEDS_TOTAL_MESSAGE = 'A área útil não pode ser maior que a área total.';
export const FARM_APTITUDE_UNKNOWN_MESSAGE = 'Aptidão inválida.';
export const FARM_CROP_UNKNOWN_MESSAGE = 'Cultura inválida.';
export const FARM_COORDINATES_PAIR_MESSAGE = 'Informe a latitude e a longitude juntas.';
export const FARM_NO_DEFAULT_STATUS_MESSAGE =
  'Cadastre um status comercial ativo com o significado "Disponível" antes de cadastrar fazendas.';

export const FARM_PRICING_MODE_REQUIRED_MESSAGE = 'Informe o modo de precificação.';
export const FARM_PRICING_FIELD_NOT_APPLICABLE_MESSAGE = 'Este campo não vale para o modo de precificação escolhido.';
export const FARM_ASKING_PRICE_REQUIRED_MESSAGE = 'Informe o preço pedido.';
export const FARM_VALUATION_BAGS_REQUIRED_MESSAGE = 'Informe a quantidade de sacas.';
export const FARM_VALUATION_UNIT_REQUIRED_MESSAGE = 'Informe a unidade da avaliação.';
export const FARM_VALUATION_ALQUEIRE_TYPE_REQUIRED_MESSAGE = 'Informe o tipo de alqueire da avaliação.';
export const FARM_VALUATION_ALQUEIRE_TYPE_ONLY_PER_ALQUEIRE_MESSAGE = 'O tipo de alqueire só vale para avaliação por alqueire.';
export const FARM_VALUATION_CROP_REQUIRED_MESSAGE = 'Informe a cultura de referência.';
export const FARM_VALUATION_CROP_UNKNOWN_MESSAGE = 'Cultura de referência inválida.';

/** Rótulos dos derivados de preço: não são colunas, então não vão ao registro de campos. */
export const PRICE_DERIVATIVE_LABELS = {
  pricePerHectare: 'Valor por hectare',
  pricePerUsableHectare: 'Valor por hectare útil',
  bagsPerHectare: 'Sacas por hectare',
  noPrice: 'Preço não informado',
} as const;

const ASKING_PRICE_SCALE = MONEY_SCALE;
const VALUATION_BAGS_SCALE = 4;
export const FARM_OWNER_UNKNOWN_MESSAGE = 'Proprietário inválido.';
export const FARM_OWNER_DUPLICATED_MESSAGE = 'Um contato não pode ser proprietário duas vezes na mesma fazenda.';
export const FARM_OWNER_PRIMARY_MESSAGE = 'Marque exatamente um proprietário principal.';
export const FARM_OWNER_CONFLICT_MESSAGE =
  'Outra alteração mudou os proprietários desta fazenda ao mesmo tempo. Recarregue e tente de novo.';

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

/** Decimal canônico positivo, nos limites do `numeric(precision, scale)` da coluna. */
export const positiveDecimalSchema = (integerDigits: number, scale: number, requiredMessage: string, invalidMessage: string) => {
  const pattern = new RegExp(`^\\d{1,${integerDigits}}(\\.\\d{1,${scale}})?$`);
  return z
    .string({ error: requiredMessage })
    .trim()
    .min(1, requiredMessage)
    .regex(pattern, invalidMessage)
    .refine(
      (value) => !pattern.test(value) || compareDecimal(value, '0') > 0,
      `${invalidMessage.replace(/\.$/, '')} deve ser maior que zero.`,
    );
};

const farmNameSchema = z
  .string({ error: 'Informe o nome.' })
  .trim()
  .min(1, 'Informe o nome.')
  .max(FARM_NAME_MAX_LENGTH, `O nome aceita até ${FARM_NAME_MAX_LENGTH} caracteres.`);

const ibgeCodeSchema = z
  .string({ error: 'Informe o município.' })
  .min(1, 'Informe o município.')
  .regex(/^\d{7}$/, FARM_MUNICIPALITY_UNKNOWN_MESSAGE);

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
  z
    .string({ error: `${label} inválida.` })
    .trim()
    .regex(DISTANCE_PATTERN, `${label} inválida.`)
    .nullable();

const coordinateSchema = (label: 'Latitude' | 'Longitude', limit: number) =>
  z
    .string({ error: `${label} inválida.` })
    .trim()
    .regex(COORDINATE_PATTERN, `${label} inválida.`)
    .refine(
      (value) =>
        !COORDINATE_PATTERN.test(value) ||
        (compareDecimal(value, String(-limit)) >= 0 && compareDecimal(value, String(limit)) <= 0),
      `${label} deve ficar entre -${limit} e ${limit}.`,
    )
    .nullable();

/** Uma ou nenhuma das duas coordenadas é erro de campo, no que falta. */
const coordinatesPairIssue = (latitude: string | null, longitude: string | null, ctx: z.RefinementCtx) => {
  if ((latitude === null) !== (longitude === null)) {
    ctx.addIssue({
      code: 'custom',
      path: [latitude === null ? 'latitude' : 'longitude'],
      message: FARM_COORDINATES_PAIR_MESSAGE,
    });
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

/** Proprietário como o corpo o envia: o contato e a marca de principal. */
export const farmOwnerInputSchema = z.object({
  contactId: z.uuid({ error: FARM_OWNER_UNKNOWN_MESSAGE }),
  isPrimary: z.boolean({ error: FARM_OWNER_PRIMARY_MESSAGE }),
});
export type FarmOwnerInput = z.output<typeof farmOwnerInputSchema>;

/** Conjunto de proprietários: sem repetido e, com ao menos um, exatamente um principal. */
export const ownersSchema = z.array(farmOwnerInputSchema).superRefine((owners, ctx) => {
  if (new Set(owners.map((owner) => owner.contactId)).size !== owners.length) {
    ctx.addIssue({ code: 'custom', path: [], message: FARM_OWNER_DUPLICATED_MESSAGE });
  }
  if (owners.length > 0 && owners.filter((owner) => owner.isPrimary).length !== 1) {
    ctx.addIssue({ code: 'custom', path: [], message: FARM_OWNER_PRIMARY_MESSAGE });
  }
});

const pricingShape = {
  pricingMode: z.enum(PRICING_MODES, { error: FARM_PRICING_MODE_REQUIRED_MESSAGE }).nullable(),
  askingPrice: positiveDecimalSchema(
    14,
    ASKING_PRICE_SCALE,
    FARM_ASKING_PRICE_REQUIRED_MESSAGE,
    'Preço pedido inválido.',
  ).nullable(),
  valuationBags: positiveDecimalSchema(
    10,
    VALUATION_BAGS_SCALE,
    FARM_VALUATION_BAGS_REQUIRED_MESSAGE,
    'Quantidade de sacas inválida.',
  ).nullable(),
  valuationBagsUnit: z.enum(VALUATION_BAGS_UNITS, { error: FARM_VALUATION_UNIT_REQUIRED_MESSAGE }).nullable(),
  valuationBagsAlqueireType: z.enum(ALQUEIRE_TYPES, { error: FARM_VALUATION_ALQUEIRE_TYPE_REQUIRED_MESSAGE }).nullable(),
  valuationCropId: z.uuid({ error: FARM_VALUATION_CROP_UNKNOWN_MESSAGE }).nullable(),
};

type PricingFields = {
  [K in keyof typeof pricingShape]?: z.output<(typeof pricingShape)[K]> | undefined;
};
const PRICING_FIELDS = Object.keys(pricingShape) as (keyof typeof pricingShape)[];

/**
 * O conjunto da precificação, o mesmo do `CHECK` da tabela: sem modo, tudo
 * vazio; em reais, só o preço pedido; em sacas, quantidade, unidade e cultura
 * (e o tipo de alqueire se e somente se por alqueire). No `PATCH`, campo de
 * preço sem o modo no mesmo corpo é recusado: o modo manda no bloco inteiro.
 */
const checkPricing = (value: PricingFields, ctx: z.RefinementCtx, { patch }: { patch: boolean }) => {
  const present = (field: keyof typeof pricingShape) => value[field] !== undefined && value[field] !== null;
  const refuse = (field: keyof typeof pricingShape, message: string) => ctx.addIssue({ code: 'custom', path: [field], message });

  if (value.pricingMode === undefined && patch) {
    if (PRICING_FIELDS.some(present)) refuse('pricingMode', FARM_PRICING_MODE_REQUIRED_MESSAGE);
    return;
  }
  const notApplicable = (fields: (keyof typeof pricingShape)[]) => {
    for (const field of fields) if (present(field)) refuse(field, FARM_PRICING_FIELD_NOT_APPLICABLE_MESSAGE);
  };
  const BAGS_FIELDS = ['valuationBags', 'valuationBagsUnit', 'valuationBagsAlqueireType', 'valuationCropId'] as const;

  if (value.pricingMode == null) return notApplicable(['askingPrice', ...BAGS_FIELDS]);
  if (value.pricingMode === 'brl') {
    if (!present('askingPrice')) refuse('askingPrice', FARM_ASKING_PRICE_REQUIRED_MESSAGE);
    return notApplicable([...BAGS_FIELDS]);
  }
  notApplicable(['askingPrice']);
  if (!present('valuationBags')) refuse('valuationBags', FARM_VALUATION_BAGS_REQUIRED_MESSAGE);
  if (!present('valuationBagsUnit')) refuse('valuationBagsUnit', FARM_VALUATION_UNIT_REQUIRED_MESSAGE);
  if (!present('valuationCropId')) refuse('valuationCropId', FARM_VALUATION_CROP_REQUIRED_MESSAGE);
  if (value.valuationBagsUnit === 'per_alqueire' && !present('valuationBagsAlqueireType')) {
    refuse('valuationBagsAlqueireType', FARM_VALUATION_ALQUEIRE_TYPE_REQUIRED_MESSAGE);
  }
  if (value.valuationBagsUnit === 'per_hectare' && present('valuationBagsAlqueireType')) {
    refuse('valuationBagsAlqueireType', FARM_VALUATION_ALQUEIRE_TYPE_ONLY_PER_ALQUEIRE_MESSAGE);
  }
};

const checkFarm = (
  value: Parameters<typeof checkAreas>[0] & Parameters<typeof checkCoordinates>[0] & PricingFields,
  ctx: z.RefinementCtx,
) => {
  checkAreas(value, ctx);
  checkCoordinates(value, ctx);
  checkPricing(value, ctx, { patch: false });
};

const checkFarmPatch = (
  value: Parameters<typeof checkAreas>[0] & Parameters<typeof checkCoordinatesSent>[0] & PricingFields,
  ctx: z.RefinementCtx,
) => {
  checkAreas(value, ctx);
  checkCoordinatesSent(value, ctx);
  checkPricing(value, ctx, { patch: true });
};

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
  ...pricingShape,
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

const optionalPricing = {
  pricingMode: pricingShape.pricingMode.optional(),
  askingPrice: pricingShape.askingPrice.optional(),
  valuationBags: pricingShape.valuationBags.optional(),
  valuationBagsUnit: pricingShape.valuationBagsUnit.optional(),
  valuationBagsAlqueireType: pricingShape.valuationBagsAlqueireType.optional(),
  valuationCropId: pricingShape.valuationCropId.optional(),
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
    owners: ownersSchema.optional(),
    referralChain: referralChainInputSchema.optional(),
    ...optionalOnCreate,
    ...optionalPricing,
  })
  .superRefine(checkFarm);

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
    owners: ownersSchema,
    ...optionalOnCreate,
    ...optionalPricing,
  })
  .superRefine(checkFarm);
export type CreateFarmInput = z.output<typeof createFarmSchema>;

/** Só o que muda. Área útil sem a total no corpo é conferida contra o cadastro (serviço). */
export const updateFarmSchema = z
  .object({ ...farmEditableShape, owners: ownersSchema, referralChain: referralChainInputSchema })
  .partial()
  .superRefine(checkFarmPatch);
export type UpdateFarmInput = z.output<typeof updateFarmSchema>;

const namedReferenceSchema = z.object({ id: z.uuid(), name: z.string() });

export const priceDerivativesSchema = z.object({
  /** Em reais: preço pedido ÷ área total. */
  pricePerHectare: z.string().nullable(),
  /** Em reais, com área útil: preço pedido ÷ área útil. */
  pricePerUsableHectare: z.string().nullable(),
  /** Em sacas: a quantidade por hectare, convertida pelo tipo de alqueire congelado na avaliação. */
  bagsPerHectare: z.string().nullable(),
});
export type PriceDerivatives = z.infer<typeof priceDerivativesSchema>;

export interface PriceDerivativesInput {
  pricingMode: PricingMode | null;
  askingPrice: string | null;
  valuationBags: string | null;
  valuationBagsUnit: ValuationBagsUnit | null;
  valuationBagsAlqueireType: AlqueireType | null;
  totalAreaHa: string;
  usableAreaHa: string | null;
}

/**
 * Derivados do preço. Em sacas por alqueire, converte pelo tipo gravado na
 * avaliação — nunca pelo padrão da empresa, que pode ter mudado depois. Sem
 * equivalente em reais para sacas (cotações são de outra spec).
 */
export function priceDerivatives(farm: PriceDerivativesInput): PriceDerivatives {
  const derivatives: PriceDerivatives = { pricePerHectare: null, pricePerUsableHectare: null, bagsPerHectare: null };
  if (farm.pricingMode === 'brl' && farm.askingPrice !== null) {
    derivatives.pricePerHectare = divideDecimal(farm.askingPrice, farm.totalAreaHa, ASKING_PRICE_SCALE);
    if (farm.usableAreaHa !== null) {
      derivatives.pricePerUsableHectare = divideDecimal(farm.askingPrice, farm.usableAreaHa, ASKING_PRICE_SCALE);
    }
  }
  if (farm.pricingMode === 'bags' && farm.valuationBags !== null) {
    if (farm.valuationBagsUnit === 'per_hectare') {
      derivatives.bagsPerHectare = roundDecimal(farm.valuationBags, VALUATION_BAGS_SCALE);
    } else if (farm.valuationBagsUnit === 'per_alqueire' && farm.valuationBagsAlqueireType !== null) {
      derivatives.bagsPerHectare = divideDecimal(
        farm.valuationBags,
        ALQUEIRE_HECTARES[farm.valuationBagsAlqueireType],
        VALUATION_BAGS_SCALE,
      );
    }
  }
  return derivatives;
}

/** Proprietário como a API o devolve, na ordem de inclusão. */
export const farmOwnerSchema = z.object({ contactId: z.uuid(), name: z.string(), isPrimary: z.boolean() });
export type FarmOwner = z.infer<typeof farmOwnerSchema>;

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
  owners: z.array(farmOwnerSchema),
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
  pricingMode: z.enum(PRICING_MODES).nullable(),
  /** Reais, decimal canônico. */
  askingPrice: z.string().nullable(),
  valuationBags: z.string().nullable(),
  valuationBagsUnit: z.enum(VALUATION_BAGS_UNITS).nullable(),
  valuationBagsAlqueireType: z.enum(ALQUEIRE_TYPES).nullable(),
  valuationCrop: namedReferenceSchema.nullable(),
  /** Derivados do preço, calculados a cada resposta (nunca colunas). */
  priceDerivatives: priceDerivativesSchema,
  createdAt: z.string(),
});
export type Farm = z.infer<typeof farmSchema>;

/** A fazenda com a cadeia de indicação: `GET /:id`, `POST` e `PATCH`; a lista não a carrega. */
export const farmDetailSchema = farmSchema.extend({ referralChain: referralChainOutputSchema });
export type FarmDetail = z.infer<typeof farmDetailSchema>;

export const FARM_SORT_FIELDS = ['createdAt', 'name', 'totalAreaHa', 'askingPrice'] as const;

export const FARM_REGION_INVALID_MESSAGE = 'Região inválida: informe o código IBGE do município ou a sigla da UF.';
export const FARM_NO_PRICE_WITH_PRICE_MESSAGE = '"Sem preço" não combina com valor mínimo ou máximo.';

/** Lista separada por vírgula, sem repetição e sem item vazio; cada item passa por `item`. */
export const commaListSchema = <TItem extends z.ZodType<unknown, string>>(item: TItem, message: string) =>
  z
    .string()
    .transform((value) => [...new Set(value.split(',').map((token) => token.trim()))])
    .pipe(z.array(item, { error: message }).min(1, message));

/**
 * Status comercial da lista: ids separados por vírgula. Sem o parâmetro, a lista
 * e o total deixam de fora as fazendas de significado `inactive`.
 */
const statusFilterSchema = commaListSchema(z.uuid({ error: FARM_STATUS_UNKNOWN_MESSAGE }), FARM_STATUS_UNKNOWN_MESSAGE);

const UF_SET: ReadonlySet<string> = new Set(UFS);

/** Região: código IBGE de município (7 dígitos) ou sigla de UF, misturados. */
export const regionFilterSchema = commaListSchema(
  z
    .string({ error: FARM_REGION_INVALID_MESSAGE })
    .refine((token) => /^\d{7}$/.test(token) || UF_SET.has(token), FARM_REGION_INVALID_MESSAGE),
  FARM_REGION_INVALID_MESSAGE,
);

const idsFilter = (message: string) => commaListSchema(z.uuid({ error: message }), message).optional();

/** Decimal de filtro como texto até o SQL: hectares (4 casas) e reais (2 casas), maiores que zero. */
const areaFilterSchema = (invalid: string) => positiveDecimalSchema(8, AREA_SCALE, invalid, invalid);
const priceFilterSchema = (invalid: string) => positiveDecimalSchema(14, ASKING_PRICE_SCALE, invalid, invalid);
/** Distância máxima em km: zero vale (só a que está a 0 km), nulo fica fora. */
const distanceFilterSchema = (invalid: string) => z.string().trim().regex(DISTANCE_PATTERN, invalid);

/** Filtros da listagem; todos opcionais. Lista = qualquer um dos valores; filtros diferentes se somam. */
export const farmListFilters = {
  region: regionFilterSchema.optional(),
  tradingPostId: idsFilter(FARM_TRADING_POST_UNKNOWN_MESSAGE),
  aptitudeId: idsFilter(FARM_APTITUDE_UNKNOWN_MESSAGE),
  cropId: idsFilter(FARM_CROP_UNKNOWN_MESSAGE),
  commercialStatusId: statusFilterSchema.optional(),
  responsibleUserId: idsFilter('Corretor responsável inválido.'),
  salesPotential: commaListSchema(levelSchema, 'Nível inválido.').optional(),
  priority: commaListSchema(levelSchema, 'Nível inválido.').optional(),
  waterAvailability: commaListSchema(levelSchema, 'Nível inválido.').optional(),
  irrigationPotential: commaListSchema(levelSchema, 'Nível inválido.').optional(),
  productivePotential: commaListSchema(levelSchema, 'Nível inválido.').optional(),
  documentStatus: commaListSchema(z.enum(DOCUMENT_STATUSES), 'Situação documental inválida.').optional(),
  areaMin: areaFilterSchema('Área mínima inválida.').optional(),
  areaMax: areaFilterSchema('Área máxima inválida.').optional(),
  priceMin: priceFilterSchema('Valor mínimo inválido.').optional(),
  priceMax: priceFilterSchema('Valor máximo inválido.').optional(),
  noPrice: z
    .literal('true', { error: 'Sem preço aceita só "true".' })
    .transform(() => true as const)
    .optional(),
  maxDistanceToHighwayKm: distanceFilterSchema('Distância até a rodovia inválida.').optional(),
  maxDistanceToWarehouseKm: distanceFilterSchema('Distância até o armazém inválida.').optional(),
  ownerContactId: z.uuid({ error: FARM_OWNER_UNKNOWN_MESSAGE }).optional(),
};

export const farmListQuerySchema = listQuerySchema({ sortable: FARM_SORT_FIELDS, filters: farmListFilters }).superRefine(
  (query, ctx) => {
    if (query.noPrice && (query.priceMin !== undefined || query.priceMax !== undefined)) {
      ctx.addIssue({ code: 'custom', path: ['noPrice'], message: FARM_NO_PRICE_WITH_PRICE_MESSAGE });
    }
  },
);
export type FarmListQuery = z.output<typeof farmListQuerySchema>;

export const farmPageSchema = listPageSchema(farmSchema);

/** Fazenda na seção "Fazendas" da ficha do contato: o status em qualquer valor e a marca de principal daquele contato. */
export const contactFarmSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  municipality: municipalityOptionSchema,
  commercialStatus: namedReferenceSchema,
  isPrimary: z.boolean(),
});
export type ContactFarm = z.infer<typeof contactFarmSchema>;

export const contactFarmPageSchema = listPageSchema(contactFarmSchema);

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

export const FARM_OPTIONS_PAGE_SIZE = 20;
export const FARM_OPTIONS_MAX_PAGE_SIZE = 50;

/**
 * Parâmetros de `/options`: busca por nome ou município, paginação por cursor
 * opaco e hidratação por ids (lista separada por vírgula, que ignora busca e cursor).
 */
export const farmOptionsQuerySchema = z.object({
  q: z.string().trim().max(FARM_NAME_MAX_LENGTH).optional(),
  cursor: z
    .string()
    .regex(/^\d{1,9}$/, 'Cursor inválido.')
    .optional(),
  limit: z.coerce.number().int().min(1).max(FARM_OPTIONS_MAX_PAGE_SIZE).default(FARM_OPTIONS_PAGE_SIZE),
  ids: z
    .string()
    .optional()
    .transform((value) => (value ? value.split(',').filter((id) => id !== '') : []))
    .pipe(z.array(z.uuid()).max(FARM_OPTIONS_MAX_PAGE_SIZE)),
});
export type FarmOptionsQuery = z.output<typeof farmOptionsQuerySchema>;

export const farmOptionsPageSchema = z.object({
  items: z.array(farmOptionSchema),
  nextCursor: z.string().optional(),
});
export type FarmOptionsPage = z.infer<typeof farmOptionsPageSchema>;

const BAGS_SUMMARY_FORMAT = { minScale: 0, maxScale: 2 };

/**
 * O preço da fazenda numa linha, como a lista e o cartão mostram: reais, a
 * avaliação em sacas com a unidade e a cultura, ou "Preço não informado".
 * Sacas não viram reais (sem cotação nesta spec).
 */
export function farmPriceSummary(
  farm: Pick<
    Farm,
    'pricingMode' | 'askingPrice' | 'valuationBags' | 'valuationBagsUnit' | 'valuationBagsAlqueireType' | 'valuationCrop'
  >,
): string {
  if (farm.pricingMode === 'brl' && farm.askingPrice) return formatMoney(farm.askingPrice);
  if (farm.pricingMode === 'bags' && farm.valuationBags && farm.valuationBagsUnit) {
    const unit =
      farm.valuationBagsUnit === 'per_alqueire'
        ? farm.valuationBagsAlqueireType
          ? `por ${ALQUEIRE_LABELS[farm.valuationBagsAlqueireType].replace('alq. ', 'alqueire ')}`
          : 'por alqueire'
        : 'por hectare';
    const bags = `${formatDecimal(farm.valuationBags, BAGS_SUMMARY_FORMAT)} sacas ${unit}`;
    return farm.valuationCrop ? `${bags} · ${farm.valuationCrop.name}` : bags;
  }
  return PRICE_DERIVATIVE_LABELS.noPrice;
}
