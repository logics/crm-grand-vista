// Perfil de compra do contato com papel comprador: o padrão permanente do que
// ele procura e de como compra. Vive aninhado em `buyerProfile` no contato e é
// gravado no save dele, com substituição completa.
//
// Nesta fatia só as colunas simples entram na API. Patrimônio estimado e
// capacidade de investimento existem no banco, mas não têm chave aqui: chegam
// com a permissão própria, para nunca ficarem visíveis a todos. Regiões,
// culturas e formas de pagamento (junções) também chegam depois.
import { z } from 'zod';
import { AREA_SCALE, MONEY_SCALE, compareDecimal } from './decimal.js';
import { LEVELS, positiveDecimalSchema } from './farm.js';

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
