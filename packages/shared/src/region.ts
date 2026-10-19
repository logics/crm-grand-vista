// Região de interesse: um município (tabela `municipalities`, carga do IBGE) ou
// uma UF inteira — a forma de `buyer_regions` e `opportunity_regions`, em que
// "interessado em Goiás" não obriga a listar 246 municípios.
import { z } from 'zod';

export const UF_NAMES = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapá',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Pará',
  PB: 'Paraíba',
  PR: 'Paraná',
  PE: 'Pernambuco',
  PI: 'Piauí',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondônia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'São Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
} as const;

export type Uf = keyof typeof UF_NAMES;

export const UFS = Object.keys(UF_NAMES) as Uf[];

export const ufSchema = z.enum(UFS as [Uf, ...Uf[]]);

/** Município como a busca o devolve: o código IBGE é a identidade. */
export const municipalityOptionSchema = z.object({
  ibgeCode: z.string().regex(/^\d{7}$/),
  name: z.string(),
  uf: ufSchema,
});

export type MunicipalityOption = z.infer<typeof municipalityOptionSchema>;

/** A UF inteira como região; o nome sai de `UF_NAMES`. */
export const ufOptionSchema = z.object({ uf: ufSchema });

export type UfOption = z.infer<typeof ufOptionSchema>;

/**
 * Município ou UF: `{ ibgeCode }` ou `{ uf }`. O município também tem `uf`, então
 * a distinção é pela presença de `ibgeCode` (`isMunicipality`), nunca por `'uf' in`.
 */
export const regionOptionSchema = z.union([municipalityOptionSchema, ufOptionSchema]);

export type RegionOption = z.infer<typeof regionOptionSchema>;

export const isMunicipality = (region: RegionOption): region is MunicipalityOption => 'ibgeCode' in region;

/** Identidade da região: código IBGE (sete dígitos) ou sigla (duas letras), que nunca colidem. */
export const regionKey = (region: RegionOption) => (isMunicipality(region) ? region.ibgeCode : region.uf);

/** "Rio Verde — GO". */
export const municipalityLabel = (municipality: MunicipalityOption) => `${municipality.name} — ${municipality.uf}`;

/** "Rio Verde — GO" ou "Goiás (UF)". */
export const regionLabel = (region: RegionOption) =>
  isMunicipality(region) ? municipalityLabel(region) : `${UF_NAMES[region.uf]} (UF)`;
