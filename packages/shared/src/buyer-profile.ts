// Perfil de compra do contato com papel comprador: o padrão permanente do que
// ele procura e de como compra. Vive aninhado em `buyerProfile` no contato e é
// gravado no save dele, com substituição completa.
//
// Patrimônio estimado e capacidade de investimento existem no banco, mas não
// têm chave aqui: chegam com a permissão própria, para nunca ficarem visíveis a
// todos. Regiões, culturas e formas de pagamento (as junções) vão no mesmo
// objeto e na mesma substituição completa: lista ausente é vazia.
import { z } from 'zod';
import { AREA_SCALE, MONEY_SCALE, compareDecimal } from './decimal.js';
import { LEVELS, positiveDecimalSchema } from './farm.js';
import { type Uf, ufSchema } from './region.js';

export const QUALIFICATION_LEVELS = ['cold', 'warm', 'hot', 'qualified'] as const;
export type QualificationLevel = (typeof QUALIFICATION_LEVELS)[number];

export const QUALIFICATION_LEVEL_LABELS: Record<QualificationLevel, string> = {
  cold: 'Frio',
  warm: 'Morno',
  hot: 'Quente',
  qualified: 'Qualificado',
};

export const BUYER_PROFILE_REQUIRES_BUYER_MESSAGE = 'O perfil de compra só existe para compradores.';
export const BUYER_PROFILE_PURCHASE_PROFILE_UNKNOWN_MESSAGE = 'Perfil de compra inválido.';
export const BUYER_PROFILE_PURCHASE_PROFILE_INACTIVE_MESSAGE = 'O perfil de compra escolhido está inativo.';
export const BUYER_PROFILE_CONCURRENT_SAVE_MESSAGE =
  'O perfil de compra deste contato foi gravado por outra alteração ao mesmo tempo. Recarregue e tente de novo.';
export const BUYER_PROFILE_TICKET_ORDER_MESSAGE = 'O ticket médio não pode passar do ticket máximo.';
export const BUYER_PROFILE_AREA_ORDER_MESSAGE = 'A área mínima não pode passar da área máxima.';

/** Colunas do perfil que a API expõe, na ordem do formulário. */
const BUYER_PROFILE_COLUMNS = [
  'purchaseProfileId',
  'avgTicket',
  'maxTicket',
  'minAreaHa',
  'maxAreaHa',
  'urgency',
  'qualificationLevel',
] as const;

const moneySchema = (label: string) => positiveDecimalSchema(14, MONEY_SCALE, `Informe o ${label}.`, `${label} inválido.`);
const areaSchema = (label: string) => positiveDecimalSchema(8, AREA_SCALE, `Informe a ${label}.`, `${label} inválida.`);

const nullable = <T extends z.ZodType>(schema: T) =>
  schema
    .nullable()
    .optional()
    .transform((value) => value ?? null);

export const BUYER_PROFILE_REGION_INVALID_MESSAGE = 'Informe a região por município ou por UF, nunca os dois.';
export const BUYER_PROFILE_REGION_UNKNOWN_MESSAGE = 'Município inválido.';
export const BUYER_PROFILE_REGION_INACTIVE_MESSAGE = 'O município escolhido está inativo.';
export const BUYER_PROFILE_CROP_UNKNOWN_MESSAGE = 'Cultura de interesse inválida.';
export const BUYER_PROFILE_CROP_INACTIVE_MESSAGE = 'A cultura de interesse escolhida está inativa.';
export const BUYER_PROFILE_PAYMENT_METHOD_UNKNOWN_MESSAGE = 'Forma de pagamento inválida.';
export const BUYER_PROFILE_PAYMENT_METHOD_INACTIVE_MESSAGE = 'A forma de pagamento escolhida está inativa.';

/** Região de entrada: só a chave, `{ ibgeCode }` ou `{ uf }`; os dois juntos, ou nenhum, são recusados. */
const regionInputSchema = z.union([z.strictObject({ ibgeCode: z.string().regex(/^\d{7}$/) }), z.strictObject({ uf: ufSchema })], {
  error: BUYER_PROFILE_REGION_INVALID_MESSAGE,
});
export type BuyerRegionKey = { ibgeCode: string } | { uf: Uf };

export const buyerRegionKeyOf = (region: BuyerRegionKey): string => ('ibgeCode' in region ? region.ibgeCode : region.uf);

/** Primeira ocorrência de cada chave, na ordem em que vieram. */
const uniqueBy = <T>(items: readonly T[], key: (item: T) => string): T[] => [
  ...new Map(items.map((item) => [key(item), item] as const)).values(),
];

const idList = (message: string) =>
  z
    .array(z.uuid({ error: message }))
    .optional()
    .transform((ids) => [...new Set(ids ?? [])]);

const MONEY_PATTERN = new RegExp(`^\\d{1,14}(\\.\\d{1,${MONEY_SCALE}})?$`);
const AREA_PATTERN = new RegExp(`^\\d{1,8}(\\.\\d{1,${AREA_SCALE}})?$`);

/** Os dois lados presentes e bem formados, com o primeiro acima do segundo. */
const exceeds = (pattern: RegExp, low: string | null, high: string | null) =>
  low !== null && high !== null && pattern.test(low) && pattern.test(high) && compareDecimal(low, high) > 0;

/**
 * Perfil de compra de entrada. Campo ausente é nulo (substituição completa, sem
 * merge parcial); chave desconhecida, como as financeiras, é descartada.
 */
export const buyerProfileSchema = z
  .object({
    regions: z
      .array(regionInputSchema)
      .optional()
      .transform((regions) => uniqueBy(regions ?? [], buyerRegionKeyOf)),
    cropIds: idList(BUYER_PROFILE_CROP_UNKNOWN_MESSAGE),
    paymentMethodIds: idList(BUYER_PROFILE_PAYMENT_METHOD_UNKNOWN_MESSAGE),
    purchaseProfileId: nullable(z.uuid({ error: BUYER_PROFILE_PURCHASE_PROFILE_UNKNOWN_MESSAGE })),
    avgTicket: nullable(moneySchema('ticket médio')),
    maxTicket: nullable(moneySchema('ticket máximo')),
    minAreaHa: nullable(areaSchema('área mínima')),
    maxAreaHa: nullable(areaSchema('área máxima')),
    urgency: nullable(z.enum(LEVELS, { error: 'Urgência inválida.' })),
    qualificationLevel: nullable(z.enum(QUALIFICATION_LEVELS, { error: 'Grau de qualificação inválido.' })),
  })
  .superRefine((profile, ctx) => {
    if (exceeds(MONEY_PATTERN, profile.avgTicket, profile.maxTicket)) {
      ctx.addIssue({ code: 'custom', path: ['avgTicket'], message: BUYER_PROFILE_TICKET_ORDER_MESSAGE });
    }
    if (exceeds(AREA_PATTERN, profile.minAreaHa, profile.maxAreaHa)) {
      ctx.addIssue({ code: 'custom', path: ['minAreaHa'], message: BUYER_PROFILE_AREA_ORDER_MESSAGE });
    }
  });
export type BuyerProfileInput = z.output<typeof buyerProfileSchema>;

/** O perfil como a API o devolve: sem as chaves financeiras. */
export const buyerProfileOutputSchema = z.object({
  regions: z.array(z.union([z.strictObject({ ibgeCode: z.string() }), z.strictObject({ uf: ufSchema })])),
  cropIds: z.array(z.uuid()),
  paymentMethodIds: z.array(z.uuid()),
  purchaseProfileId: z.uuid().nullable(),
  avgTicket: z.string().nullable(),
  maxTicket: z.string().nullable(),
  minAreaHa: z.string().nullable(),
  maxAreaHa: z.string().nullable(),
  urgency: z.enum(LEVELS).nullable(),
  qualificationLevel: z.enum(QUALIFICATION_LEVELS).nullable(),
});
export type BuyerProfile = z.infer<typeof buyerProfileOutputSchema>;

/** Perfil sem nenhuma coluna preenchida não tem linha. */
export const isBuyerProfileEmpty = (profile: Partial<Record<(typeof BUYER_PROFILE_COLUMNS)[number], unknown>>): boolean =>
  BUYER_PROFILE_COLUMNS.every((column) => profile[column] === null || profile[column] === undefined);
