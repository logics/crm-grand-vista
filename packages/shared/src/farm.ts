// Fazenda como os seletores a mostram: nome, município e área total.
import { z } from 'zod';
import { AREA_SCALE, formatDecimal } from './decimal.js';
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
export const formatHectares = (area: string) => `${formatDecimal(area, { minScale: 0, maxScale: AREA_SCALE })} ha`;
