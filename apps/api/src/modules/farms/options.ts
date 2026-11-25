// Opções do seletor de fazenda (`GET /farms/options`). Fica fora de
// `service.ts` para o seletor evoluir sem tocar a lista.
import { commercialStatuses, farms, municipalities, normalizedText, type Transaction } from '@crm/db';
import type { FarmOption, FarmOptionsPage, FarmOptionsQuery } from '@crm/shared';
import { and, asc, eq, exists, inArray, notInArray, or, sql } from 'drizzle-orm';
import type { EffectiveAccess } from '../../authorization/effective-access.js';
import { farmScopeOf } from './scope.js';
import { escapeLike } from '../../listing/query.js';

const byName = sql`${farms.name} collate "pt-BR-x-icu"`;

async function toOptions(tx: Transaction, rows: { id: string; name: string; municipalityIbgeCode: string; totalAreaHa: string }[]): Promise<FarmOption[]> {
  if (rows.length === 0) return [];
  const places = await tx
    .select({ ibgeCode: municipalities.ibgeCode, name: municipalities.name, uf: municipalities.uf })
    .from(municipalities)
    .where(inArray(municipalities.ibgeCode, [...new Set(rows.map((row) => row.municipalityIbgeCode))]));
  const byCode = new Map(places.map((place) => [place.ibgeCode, place]));
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    municipality: byCode.get(row.municipalityIbgeCode)! as FarmOption['municipality'],
    totalAreaHa: row.totalAreaHa,
  }));
}

/**
 * Opções do seletor, sempre no escopo de dados de quem consulta. A busca (`q`)
 * acha por nome ou município, sem caixa nem acento, e deixa de fora as
 * desativadas; `ids` hidrata as fazendas gravadas, desativadas inclusive, e
 * ignora busca e cursor. Paginação por posição (cursor = deslocamento): a
 * ordem é total (termina em `id`), então nada repete nem se perde.
 */
export async function listFarmOptions(tx: Transaction, access: EffectiveAccess, query: FarmOptionsQuery): Promise<FarmOptionsPage> {
  const scope = farmScopeOf(access);
  const columns = { id: farms.id, name: farms.name, municipalityIbgeCode: farms.municipalityIbgeCode, totalAreaHa: farms.totalAreaHa };

  if (query.ids.length > 0) {
    const rows = await tx.select(columns).from(farms).where(and(scope, inArray(farms.id, query.ids))).orderBy(byName, asc(farms.id));
    return { items: await toOptions(tx, rows) };
  }

  const pattern = query.q ? normalizedText(`%${escapeLike(query.q)}%`) : undefined;
  const matches = pattern
    ? or(
        sql`${normalizedText(farms.name)} like ${pattern}`,
        exists(
          tx
            .select({ one: sql`1` })
            .from(municipalities)
            .where(and(eq(municipalities.ibgeCode, farms.municipalityIbgeCode), sql`${normalizedText(municipalities.name)} like ${pattern}`)),
        ),
      )
    : undefined;
  const notInactive = notInArray(
    farms.commercialStatusId,
    tx.select({ id: commercialStatuses.id }).from(commercialStatuses).where(eq(commercialStatuses.systemMeaning, 'inactive')),
  );
  const offset = query.cursor === undefined ? 0 : Number(query.cursor);
  const rows = await tx
    .select(columns)
    .from(farms)
    .where(and(scope, notInactive, matches))
    .orderBy(byName, asc(farms.id))
    .limit(query.limit + 1)
    .offset(offset);

  const items = await toOptions(tx, rows.slice(0, query.limit));
  return rows.length > query.limit ? { items, nextCursor: String(offset + query.limit) } : { items };
}
