import type { MunicipalityRecord } from './types.js';

const BATCH_SIZE = 500;

const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;

const row = (m: MunicipalityRecord) => `(${[m.ibgeCode, m.name, m.uf, m.region].map(quote).join(', ')})`;

/**
 * SQL do delta entre o snapshot anterior e a lista nova, ou `null` sem diferença.
 * Município novo é `INSERT` (e reativa o que voltou à lista); nome ou UF alterados
 * são `UPDATE`; o que sumiu fica `active = false`. Nunca `DELETE`: fazendas,
 * praças e regiões de interesse apontam para o município.
 */
export function buildMunicipalitiesDelta(
  previous: readonly MunicipalityRecord[],
  next: readonly MunicipalityRecord[],
): string | null {
  const before = new Map(previous.map((m) => [m.ibgeCode, m]));
  const after = new Map(next.map((m) => [m.ibgeCode, m]));

  const added = next.filter((m) => !before.has(m.ibgeCode));
  const changed = next.filter((m) => {
    const old = before.get(m.ibgeCode);
    return old && (old.name !== m.name || old.uf !== m.uf);
  });
  const removed = previous.filter((m) => !after.has(m.ibgeCode));

  const statements: string[] = [];

  for (let i = 0; i < added.length; i += BATCH_SIZE) {
    const rows = added.slice(i, i + BATCH_SIZE).map(row).join(',\n\t');
    statements.push(
      `INSERT INTO "municipalities" ("ibge_code", "name", "uf", "region") VALUES\n\t${rows}\n` +
        `ON CONFLICT ("ibge_code") DO UPDATE SET "name" = EXCLUDED."name", "uf" = EXCLUDED."uf", ` +
        `"region" = EXCLUDED."region", "active" = true;`,
    );
  }
  for (const m of changed) {
    statements.push(
      `UPDATE "municipalities" SET "name" = ${quote(m.name)}, "uf" = ${quote(m.uf)}, "region" = ${quote(m.region)} ` +
        `WHERE "ibge_code" = ${quote(m.ibgeCode)};`,
    );
  }
  for (let i = 0; i < removed.length; i += BATCH_SIZE) {
    const codes = removed.slice(i, i + BATCH_SIZE).map((m) => quote(m.ibgeCode)).join(', ');
    statements.push(`UPDATE "municipalities" SET "active" = false WHERE "ibge_code" IN (${codes});`);
  }

  return statements.length === 0 ? null : statements.join('\n--> statement-breakpoint\n') + '\n';
}
