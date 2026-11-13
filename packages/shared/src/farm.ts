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
  hectaresToAlqueires,
  roundDecimal,
} from './decimal.js';
import { listPageSchema, listQuerySchema } from './listing.js';
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
export const FARM_MUNICIPALITY_UNKNOWN_MESSAGE = 'Município inválido.';
export const FARM_TRADING_POST_UNKNOWN_MESSAGE = 'Praça inválida.';
export const FARM_STATUS_UNKNOWN_MESSAGE = 'Status comercial inválido.';
export const FARM_RESPONSIBLE_UNKNOWN_MESSAGE = 'O corretor responsável precisa ter vínculo com a empresa.';
export const FARM_RESPONSIBLE_FORBIDDEN_MESSAGE = 'Você só pode atribuir fazendas a si mesmo.';
export const FARM_USABLE_AREA_EXCEEDS_TOTAL_MESSAGE = 'A área útil não pode ser maior que a área total.';
export const FARM_NO_DEFAULT_STATUS_MESSAGE = 'Cadastre um status comercial ativo com o significado "Disponível" antes de cadastrar fazendas.';

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
const positiveDecimalSchema = (integerDigits: number, scale: number, requiredMessage: string, invalidMessage: string) => {
  const pattern = new RegExp(`^\\d{1,${integerDigits}}(\\.\\d{1,${scale}})?$`);
  return z
    .string({ error: requiredMessage })
    .trim()
    .min(1, requiredMessage)
    .regex(pattern, invalidMessage)
    .refine((value) => !pattern.test(value) || compareDecimal(value, '0') > 0, `${invalidMessage.replace(/\.$/, '')} deve ser maior que zero.`);
};

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

const pricingShape = {
  pricingMode: z.enum(PRICING_MODES, { error: FARM_PRICING_MODE_REQUIRED_MESSAGE }).nullable(),
  askingPrice: positiveDecimalSchema(14, ASKING_PRICE_SCALE, FARM_ASKING_PRICE_REQUIRED_MESSAGE, 'Preço pedido inválido.').nullable(),
  valuationBags: positiveDecimalSchema(10, VALUATION_BAGS_SCALE, FARM_VALUATION_BAGS_REQUIRED_MESSAGE, 'Quantidade de sacas inválida.').nullable(),
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
  const refuse = (field: keyof typeof pricingShape, message: string) =>
    ctx.addIssue({ code: 'custom', path: [field], message });

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

const checkFarm = (value: Parameters<typeof checkAreas>[0] & PricingFields, ctx: z.RefinementCtx) => {
  checkAreas(value, ctx);
  checkPricing(value, ctx, { patch: false });
};

const checkFarmPatch = (value: Parameters<typeof checkAreas>[0] & PricingFields, ctx: z.RefinementCtx) => {
  checkAreas(value, ctx);
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
  ...pricingShape,
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
    ...optionalPricing,
  })
  .superRefine(checkFarm);
export type CreateFarmInput = z.output<typeof createFarmSchema>;

/** Só o que muda. Área útil sem a total no corpo é conferida contra o cadastro (serviço). */
export const updateFarmSchema = z.object(farmEditableShape).partial().superRefine(checkFarmPatch);
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
