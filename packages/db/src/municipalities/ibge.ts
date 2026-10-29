import { type MunicipalityRecord, REGIONS } from './types.js';

export const IBGE_MUNICIPALITIES_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios';

type Json = Record<string, unknown>;

function field(source: unknown, key: string, where: string): unknown {
  if (typeof source !== 'object' || source === null || !(key in source) || (source as Json)[key] == null) {
    throw new Error(`Resposta do IBGE sem "${key}" em ${where}.`);
  }
  return (source as Json)[key];
}

/**
 * Lê a resposta da API de localidades do IBGE. A UF vem pelo caminho região
 * imediata → região intermediária → UF: a microrregião é nula nos municípios
 * mais recentes. Devolve a lista ordenada por código.
 */
export function parseIbgeMunicipalities(payload: unknown): MunicipalityRecord[] {
  if (!Array.isArray(payload)) throw new Error('Resposta do IBGE não é uma lista.');

  return payload
    .map((item): MunicipalityRecord => {
      const ibgeCode = String(field(item, 'id', 'município'));
      const where = `município ${ibgeCode}`;
      const intermediate = field(field(item, 'regiao-imediata', where), 'regiao-intermediaria', where);
      const uf = field(intermediate, 'UF', where);
      const region = String(field(field(uf, 'regiao', where), 'nome', where));

      if (!/^\d{7}$/.test(ibgeCode)) throw new Error(`Código IBGE fora do formato de 7 dígitos: ${ibgeCode}.`);
      if (!(REGIONS as readonly string[]).includes(region)) throw new Error(`Grande região desconhecida em ${where}: ${region}.`);

      return { ibgeCode, name: String(field(item, 'nome', where)), uf: String(field(uf, 'sigla', where)), region };
    })
    .sort((a, b) => a.ibgeCode.localeCompare(b.ibgeCode));
}
