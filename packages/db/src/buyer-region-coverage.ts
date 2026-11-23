// Cobertura de região do comprador: "interessar-se pela UF é interessar-se por
// todos os municípios dela". É a regra única de consulta, usada pelo filtro da
// lista de contatos e pelo matching da Fase 2 — ninguém a reescreve à mão.
import { inArray, or, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { buyerRegions } from './schema/buyer-profiles.js';
import { municipalities } from './schema/municipalities.js';

const IBGE_CODE = /^\d{7}$/;

/**
 * Condição `EXISTS` sobre `buyer_regions`: o comprador (`contactId`) tem alguma
 * região de interesse que cobre alguma das regiões pedidas (código IBGE de
 * município ou sigla de UF, misturados). A cobertura vale nos dois sentidos:
 *
 * - pedir a UF GO casa quem marcou a UF GO ou qualquer município de GO;
 * - pedir o município Rio Verde casa quem marcou Rio Verde ou a UF GO,
 *   e não quem marcou outro município de GO nem outra UF.
 *
 * `regions` vazio não casa ninguém. `contactId` é a coluna (ou expressão) do
 * contato na consulta de fora.
 */
export function buyerRegionCovers(contactId: AnyPgColumn | SQL, regions: readonly string[]): SQL {
  const codes = regions.filter((region) => IBGE_CODE.test(region));
  const ufs = regions.filter((region) => !IBGE_CODE.test(region));
  const marked = sql`coalesce(${buyerRegions.uf}, ${municipalities.uf})`;
  const matches = or(
    // Município pedido: marcou o próprio município ou a UF dele.
    codes.length > 0 ? inArray(buyerRegions.municipalityIbgeCode, codes) : undefined,
    codes.length > 0
      ? sql`${buyerRegions.uf} in (select ${municipalities.uf} from ${municipalities} where ${inArray(municipalities.ibgeCode, codes)})`
      : undefined,
    // UF pedida: marcou a UF ou qualquer município dela.
    ufs.length > 0 ? inArray(marked, ufs) : undefined,
  );
  if (!matches) return sql`false`;
  return sql`exists (
    select 1 from ${buyerRegions}
    left join ${municipalities} on ${municipalities.ibgeCode} = ${buyerRegions.municipalityIbgeCode}
    where ${buyerRegions.contactId} = ${contactId} and (${matches})
  )`;
}
