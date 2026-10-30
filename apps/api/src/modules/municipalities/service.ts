// Busca de municípios: dado de referência fora do RLS, lido na transação da
// empresa ativa só para que a rota viva sob `/e/:tenant`.
import { municipalities, type Transaction } from '@crm/db';
import { UF_NAMES, UFS, type Uf, type UfOption } from '@crm/shared';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { escapeLike } from '../../listing/query.js';

export const MUNICIPALITY_PAGE_SIZE = 20;

export interface MunicipalityItem {
  ibgeCode: string;
  name: string;
  uf: Uf;
  active: boolean;
}

const columns = {
  ibgeCode: municipalities.ibgeCode,
  name: municipalities.name,
  uf: municipalities.uf,
  active: municipalities.active,
};

/**
 * O cursor é a posição na ordem da busca. Opaco para quem consome; só vale se
 * a API o emitiu — `decodeCursor` recusa qualquer outra coisa.
 */
export const encodeCursor = (offset: number): string => Buffer.from(String(offset)).toString('base64url');

/** O deslocamento do cursor, ou nulo se ele não foi emitido por `encodeCursor`. */
export function decodeCursor(cursor: string): number | null {
  const text = Buffer.from(cursor, 'base64url').toString();
  const offset = Number(text);
  return encodeCursor(offset) === cursor && Number.isSafeInteger(offset) && offset > 0 ? offset : null;
}

const UF_SET: ReadonlySet<string> = new Set(UFS);

/**
 * "bom jesus go" é o nome "bom jesus" na UF GO: o último token vira filtro de
 * UF quando é sigla e há outro token antes. Um token sozinho é nome.
 */
export function splitSearch(q: string | undefined, explicitUf?: Uf): { term: string; uf?: Uf } {
  const tokens = (q ?? '').split(/\s+/).filter(Boolean);
  const last = tokens.at(-1)?.toUpperCase();
  // Com `uf` explícito, a sigla no fim do texto continua sendo parte do nome.
  if (!explicitUf && tokens.length >= 2 && last !== undefined && UF_SET.has(last)) {
    return { term: tokens.slice(0, -1).join(' '), uf: last as Uf };
  }
  return { term: tokens.join(' ') };
}

/** Exatamente os municípios pedidos, ativos ou não: a hidratação do `AsyncCombobox`. */
export async function findMunicipalitiesByCodes(tx: Transaction, codes: readonly string[]) {
  const items = await tx
    .select(columns)
    .from(municipalities)
    .where(inArray(municipalities.ibgeCode, [...codes]))
    .orderBy(asc(municipalities.ibgeCode));
  return { items: items as MunicipalityItem[] };
}

export interface MunicipalitySearch {
  q?: string;
  uf?: Uf;
  includeUf?: boolean;
  /** Já decodificado; ausente na primeira página. */
  offset?: number;
}

const normalizeSearchText = (value: string) =>
  value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR');

const findMatchingUfs = (term: string): UfOption[] => {
  const normalizedTerm = normalizeSearchText(term);
  if (!normalizedTerm) return [];

  const matchRank = (uf: Uf) => {
    const acronym = normalizeSearchText(uf);
    const name = normalizeSearchText(UF_NAMES[uf]);
    if (acronym === normalizedTerm) return 0;
    if (name.startsWith(normalizedTerm)) return 1;
    if (acronym.includes(normalizedTerm)) return 2;
    return name.includes(normalizedTerm) ? 3 : 4;
  };

  return UFS.filter((uf) => matchRank(uf) < 4)
    .sort((left, right) => matchRank(left) - matchRank(right) || UF_NAMES[left].localeCompare(UF_NAMES[right], 'pt-BR'))
    .map((uf) => ({ uf }));
};

/**
 * Uma página da busca: só ativos; o termo casa em qualquer parte do nome, sem
 * acento nem caixa. Primeiro os nomes que começam pelo termo, depois os demais,
 * cada grupo por nome (pt-BR) e UF; o código desempata.
 */
export async function searchMunicipalities(tx: Transaction, search: MunicipalitySearch) {
  const { term, uf: ufFromText } = splitSearch(search.q, search.uf);
  const uf = search.uf ?? ufFromText;
  const name = sql`unaccent(${municipalities.name})`;
  const pattern = escapeLike(term);

  const rows = await tx
    .select(columns)
    .from(municipalities)
    .where(
      and(
        eq(municipalities.active, true),
        uf ? eq(municipalities.uf, uf) : undefined,
        term ? sql`${name} ilike unaccent(${`%${pattern}%`})` : undefined,
      ),
    )
    .orderBy(
      // Constante inteira no ORDER BY seria posição de coluna: sem termo, nenhum grupo.
      ...(term ? [sql`case when ${name} ilike unaccent(${`${pattern}%`}) then 0 else 1 end`] : []),
      sql`${municipalities.name} collate "pt-BR-x-icu"`,
      asc(municipalities.uf),
      asc(municipalities.ibgeCode),
    )
    .limit(MUNICIPALITY_PAGE_SIZE + 1)
    .offset(search.offset ?? 0);

  const items = rows.slice(0, MUNICIPALITY_PAGE_SIZE) as MunicipalityItem[];
  const page = rows.length > MUNICIPALITY_PAGE_SIZE
    ? { items, nextCursor: encodeCursor((search.offset ?? 0) + MUNICIPALITY_PAGE_SIZE) }
    : { items };

  if (search.includeUf && search.offset === undefined) {
    // Com filtro de UF, só ela pode aparecer no topo: as demais contradiriam o filtro.
    const ufs = findMatchingUfs(term).filter((option) => !uf || option.uf === uf);
    return { ...page, items: [...ufs, ...page.items] };
  }

  return page;
}
