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
    owners: ownersSchema.optional(),
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
    owners: ownersSchema,
  })
  .superRefine(checkAreas);
export type CreateFarmInput = z.output<typeof createFarmSchema>;

/** Só o que muda. Área útil sem a total no corpo é conferida contra o cadastro (serviço). */
export const updateFarmSchema = z
  .object({ ...farmEditableShape, owners: ownersSchema })
  .partial()
  .superRefine(checkAreas);
export type UpdateFarmInput = z.output<typeof updateFarmSchema>;

const namedReferenceSchema = z.object({ id: z.uuid(), name: z.string() });

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
  commercialStatus: namedReferenceSchema,
  /** Hectares, decimal canônico. */
  totalAreaHa: z.string(),
  usableAreaHa: z.string().nullable(),
  owners: z.array(farmOwnerSchema),
  createdAt: z.string(),
});
export type Farm = z.infer<typeof farmSchema>;

export const FARM_SORT_FIELDS = ['createdAt', 'name', 'totalAreaHa'] as const;

export const farmListQuerySchema = listQuerySchema({ sortable: FARM_SORT_FIELDS });
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
