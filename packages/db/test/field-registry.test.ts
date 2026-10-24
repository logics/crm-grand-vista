// Guarda do registro de metadados de campo de `@crm/shared` contra o schema do
// Drizzle: toda coluna tem metadado ou é oculta, e o nome camelCase derivado é
// o mesmo da propriedade que o schema declara.
import { FIELD_REGISTRY, columnToProperty } from '@crm/shared';
import { getTableColumns, getTableName } from 'drizzle-orm';
import { toCamelCase } from 'drizzle-orm/casing';
import { boolean, pgTable, text } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { PLATFORM_ONLY_FIELDS } from '../src/audit.js';
import * as schema from '../src/schema/index.js';
import { id, timestamps } from '../src/schema/columns.js';
import { TABLES_WITHOUT_FIELD_METADATA, findFieldCoverageGaps, tablesOf } from './support/field-coverage.js';

const realInput = {
  schema,
  registry: FIELD_REGISTRY,
  excluded: TABLES_WITHOUT_FIELD_METADATA,
  ignoredColumns: PLATFORM_ONLY_FIELDS,
};

describe('cobertura dos metadados de campo', () => {
  it('toda coluna de toda tabela do schema tem metadado ou está oculta', () => {
    expect(findFieldCoverageGaps(realInput)).toEqual([]);
  });

  it('usuário, empresa, vínculo e perfil de acesso estão registrados', () => {
    expect(Object.keys(FIELD_REGISTRY)).toEqual(
      expect.arrayContaining(['users', 'tenants', 'memberships', 'access_profiles']),
    );
  });

  it('falha com coluna sem metadado', () => {
    const farms = pgTable('farms', { id: id(), name: text('name'), waterAvailability: text('water_availability') });
    const gaps = findFieldCoverageGaps({
      ...realInput,
      schema: { ...schema, farms },
      registry: { ...FIELD_REGISTRY, farms: { fields: { id: {}, name: {} } } },
    });
    expect(gaps).toEqual(['farms.water_availability: sem metadado (coluna que não aparece é declarada como HIDDEN)']);
  });

  it('falha com tabela fora das exclusões e sem registro', () => {
    const farms = pgTable('farms', { id: id(), ...timestamps });
    expect(findFieldCoverageGaps({ ...realInput, schema: { ...schema, farms } })).toEqual([
      'farms: sem registro de metadados de campo',
    ]);
  });

  it('falha com metadado de coluna ou de tabela que não existe mais', () => {
    const gaps = findFieldCoverageGaps({
      ...realInput,
      registry: {
        ...FIELD_REGISTRY,
        users: { fields: { ...FIELD_REGISTRY.users.fields, nickname: {} } },
        farms: { fields: {} },
      },
    });
    expect(gaps).toEqual(['users.nickname: metadado de coluna que não existe', 'farms: registrada, mas não existe no schema']);
  });

  it('a lista de exclusões não guarda tabela que deixou de existir nem tabela registrada', () => {
    const gaps = findFieldCoverageGaps({
      ...realInput,
      excluded: { ...TABLES_WITHOUT_FIELD_METADATA, legacy: 'motivo', users: 'motivo' },
    });
    expect(gaps).toEqual(['users: está nas exclusões e no registro', 'legacy: nas exclusões, mas não existe no schema']);
  });

  it('as colunas só de plataforma não exigem metadado', () => {
    const flagged = pgTable('flagged', { id: id(), isSuperAdmin: boolean('is_super_admin') });
    const gaps = findFieldCoverageGaps({
      ...realInput,
      schema: { ...schema, flagged },
      registry: { ...FIELD_REGISTRY, flagged: { fields: { id: {} } } },
    });
    expect(gaps).toEqual([]);
  });
});

describe('nome camelCase derivado da coluna', () => {
  const columns = tablesOf(schema).flatMap((table) =>
    Object.entries(getTableColumns(table)).map(([property, column]) => ({
      table: getTableName(table),
      property,
      column: column.name,
    })),
  );

  it('é a propriedade que o schema declara, em toda coluna', () => {
    const mismatches = columns.filter(({ property, column }) => columnToProperty(column) !== property);
    expect(columns.length).toBeGreaterThan(0);
    expect(mismatches).toEqual([]);
  });

  it('é a conversão do `casing: camelCase` do Drizzle', () => {
    for (const { column } of columns) expect(columnToProperty(column)).toBe(toCamelCase(column));
  });
});
