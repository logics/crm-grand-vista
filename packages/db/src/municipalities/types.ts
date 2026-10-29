/** As grandes regiões do IBGE: fonte única do `CHECK` da tabela e da validação do parser. */
export const REGIONS = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'] as const;

export type Region = (typeof REGIONS)[number];

/** Município como o snapshot o guarda: só o que o IBGE publica e a tabela usa. */
export interface MunicipalityRecord {
  ibgeCode: string;
  name: string;
  uf: string;
  region: Region;
}

export const isRegion = (value: string): value is Region => (REGIONS as readonly string[]).includes(value);
