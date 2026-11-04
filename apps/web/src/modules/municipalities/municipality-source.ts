import { isMunicipality, type MunicipalityOption, municipalityOptionSchema, ufOptionSchema, type UfOption, ufSchema } from '@crm/shared';
import { z } from 'zod';
import { api } from '../../lib/api.js';

// Busca e hidratação do `MunicipalityPicker` pela rota real
// (`GET /e/:tenant/municipalities`). Quem usa o seletor (praça, fazenda, perfil
// de compra) passa o slug da empresa ativa e entrega os dois ao picker:
// `search` e `resolve`. O rótulo ("Rio Verde — GO") é do picker.

/** Município como a rota o devolve: `active` é falso para o que o IBGE retirou da lista. */
export type MunicipalityItem = MunicipalityOption & { active: boolean };

type SearchOptions = { signal: AbortSignal; cursor?: string };

const municipalityItemSchema = municipalityOptionSchema.extend({ active: z.boolean() });
const pageSchema = z.object({
  items: z.array(z.union([municipalityItemSchema, ufOptionSchema])),
  nextCursor: z.string().optional(),
});

async function readPage(response: Response) {
  if (!response.ok) throw new Error(`Falha ao buscar municípios: HTTP ${response.status}.`);
  return pageSchema.parse(await response.json());
}

/** Sem `allowUf`, a busca só devolve municípios; com ele, as UFs que casam vêm no topo. */
export function searchMunicipalities(
  slug: string,
): (term: string, options: SearchOptions) => Promise<{ items: MunicipalityItem[]; nextCursor?: string }>;
export function searchMunicipalities(
  slug: string,
  options: { allowUf: true },
): (term: string, options: SearchOptions) => Promise<{ items: Array<MunicipalityItem | UfOption>; nextCursor?: string }>;
export function searchMunicipalities(slug: string, { allowUf = false }: { allowUf?: boolean } = {}) {
  return async (term: string, { signal, cursor }: SearchOptions) => {
    const response = await api.e[':tenant'].municipalities.$get(
      { param: { tenant: slug }, query: { q: term, cursor, includeUf: allowUf ? 'true' : undefined } },
      { init: { signal } },
    );
    return readPage(response);
  };
}

/**
 * Hidrata chaves gravadas: código IBGE vai à rota (`ids`, ativo ou não); sigla
 * de UF vira `{ uf }` na hora, porque a rota só aceita códigos.
 */
export function resolveMunicipalities(slug: string) {
  return async (keys: string[]): Promise<Array<MunicipalityItem | UfOption>> => {
    const ufs = keys.flatMap((key) => {
      const uf = ufSchema.safeParse(key);
      return uf.success ? [{ uf: uf.data }] : [];
    });
    const codes = keys.filter((key) => !ufSchema.safeParse(key).success);
    if (codes.length === 0) return ufs;

    const response = await api.e[':tenant'].municipalities.$get({
      param: { tenant: slug },
      query: { ids: codes.join(',') },
    });
    return [...ufs, ...(await readPage(response)).items];
  };
}

/** A hidratação de seletor que só aceita município (sem `allowUf`): os códigos IBGE viram itens. */
export function resolveMunicipalityItems(slug: string) {
  const resolve = resolveMunicipalities(slug);
  return async (codes: string[]): Promise<MunicipalityOption[]> => (await resolve(codes)).filter(isMunicipality);
}
