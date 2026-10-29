/** Município como o snapshot o guarda: só o que o IBGE publica e a tabela usa. */
export interface MunicipalityRecord {
  ibgeCode: string;
  name: string;
  uf: string;
  region: string;
}

export const REGIONS = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'] as const;
