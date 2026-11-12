// A semente da entrada "Desativada" é SQL escrito à mão; a constante de
// `@crm/shared` é a fonte do nome. Este teste lê o SQL e confere o nome, o
// nome alternativo e a comparação por `normalize_text` na empresa da volta.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { TENANT_SEED } from '@crm/shared';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_FOLDER } from '../src/migrate.js';

const file = readdirSync(MIGRATIONS_FOLDER).find((name) => name.endsWith('_farm_inactive_status.sql'));
const sql = file ? readFileSync(join(MIGRATIONS_FOLDER, file), 'utf8') : '';

describe('migration da semente da entrada Desativada', () => {
  it('existe', () => {
    expect(file).toBeDefined();
  });

  it('usa o nome da constante TENANT_SEED e o nome alternativo', () => {
    const seed = TENANT_SEED.commercialStatuses.find((status) => status.systemMeaning === 'inactive');
    expect(seed?.name).toBe('Desativada');
    expect(sql).toContain(`chosen := '${seed!.name}'`);
    expect(sql).toContain(`chosen := 'Fazenda desativada'`);
  });

  it('compara pelo normalize_text e filtra pela empresa da volta', () => {
    expect(sql).toMatch(/normalize_text\(existing\."name"\) = normalize_text\('Desativada'\)/);
    expect(sql).toMatch(/existing\."tenant_id" = tenant\."id"/);
    expect(sql).toMatch(/set_config\('app\.tenant_id', tenant\."id"::text, true\)/);
  });

  it('só semeia onde não há entrada ativa com o significado inactive', () => {
    expect(sql).toMatch(/IF NOT EXISTS \([^)]*"system_meaning" = 'inactive'[^)]*"active"/s);
  });
});
