// Fazenda como os seletores a mostram: nome, município e área total.
import { z } from 'zod';
import { ALQUEIRE_LABELS, AREA_FORMAT, type AlqueireType, formatDecimal, hectaresToAlqueires } from './decimal.js';
import { municipalityOptionSchema } from './region.js';

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
