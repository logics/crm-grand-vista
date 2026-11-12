// A migration da semente da entrada Desativada contra o Postgres real: cria
// onde falta, usa "Fazenda desativada" quando o nome está ocupado, poupa quem
// já tem e não duplica ao reaplicar.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadMigrationEnv } from '@crm/shared/env';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MIGRATIONS_FOLDER } from '../src/migrate.js';

const owner = new pg.Client({ connectionString: loadMigrationEnv().MIGRATION_DATABASE_URL });

// Só o bloco `DO`: reaplicar o `ADD CONSTRAINT` do começo do arquivo falharia.
const seedSql = readFileSync(join(MIGRATIONS_FOLDER, '0022_farm_inactive_status.sql'), 'utf8')
  .split('--> statement-breakpoint')
  .at(-1)!;

const tenants = {
  semInactive: '0197c000-0000-7000-8000-000000000221',
  nomeOcupado: '0197c000-0000-7000-8000-000000000222',
  jaTem: '0197c000-0000-7000-8000-000000000223',
  soDesativada: '0197c000-0000-7000-8000-000000000224',
};

describe('migration da semente da entrada Desativada em empresa existente', () => {
  const statusesOf = async (tenantId: string) => {
    await owner.query(`select set_config('app.tenant_id', $1, false)`, [tenantId]);
    return (
      await owner.query(
        `select name, system_meaning as "systemMeaning", display_order as "displayOrder", active
         from commercial_statuses order by display_order, name`,
      )
    ).rows as { name: string; systemMeaning: string; displayOrder: number; active: boolean }[];
  };

  const add = async (tenantId: string, name: string, meaning: string, order: number, active = true) => {
    await owner.query(`select set_config('app.tenant_id', $1, false)`, [tenantId]);
    await owner.query(
      `insert into commercial_statuses (id, tenant_id, name, system_meaning, display_order, active)
       values (uuidv7(), $1, $2, $3, $4, $5)`,
      [tenantId, name, meaning, order, active],
    );
  };

  beforeAll(async () => {
    await owner.connect();
    for (const [key, id] of Object.entries(tenants)) {
      await owner.query(`insert into tenants (id, slug, name) values ($1, $2, 'Antiga') on conflict do nothing`, [id, `farm-inactive-${key}`]);
    }
    await add(tenants.semInactive, 'Disponível', 'available', 0);
    await add(tenants.semInactive, 'Vendida', 'sold', 5);
    await add(tenants.nomeOcupado, 'Disponível', 'available', 0);
    await add(tenants.nomeOcupado, 'desativada', 'suspended', 1);
    await add(tenants.jaTem, 'Disponível', 'available', 0);
    await add(tenants.jaTem, 'Arquivada', 'inactive', 1);
    await add(tenants.soDesativada, 'Disponível', 'available', 0);
    await add(tenants.soDesativada, 'Desativada', 'inactive', 1, false);
  });

  afterAll(async () => {
    for (const id of Object.values(tenants)) {
      await owner.query(`select set_config('app.tenant_id', $1, false)`, [id]);
      await owner.query(`delete from commercial_statuses`);
      await owner.query(`delete from tenants where id = $1`, [id]);
    }
    await owner.end();
  });

  it('cria Desativada onde falta, usa Fazenda desativada quando o nome está ocupado, poupa quem já tem e não duplica ao reaplicar', async () => {
    await owner.query(seedSql);
    await owner.query(seedSql);

    const a = await statusesOf(tenants.semInactive);
    expect(a.filter((s) => s.systemMeaning === 'inactive')).toEqual([
      { name: 'Desativada', systemMeaning: 'inactive', displayOrder: 6, active: true },
    ]);

    const b = await statusesOf(tenants.nomeOcupado);
    expect(b.filter((s) => s.systemMeaning === 'inactive')).toEqual([
      { name: 'Fazenda desativada', systemMeaning: 'inactive', displayOrder: 2, active: true },
    ]);

    const c = await statusesOf(tenants.jaTem);
    expect(c).toHaveLength(2);
    expect(c.filter((s) => s.systemMeaning === 'inactive').map((s) => s.name)).toEqual(['Arquivada']);

    const d = await statusesOf(tenants.soDesativada);
    expect(d.filter((s) => s.systemMeaning === 'inactive' && s.active)).toEqual([
      { name: 'Fazenda desativada', systemMeaning: 'inactive', displayOrder: 2, active: true },
    ]);
  });

  it('toda empresa termina com uma entrada inactive ativa', async () => {
    await owner.query(seedSql);
    for (const id of Object.values(tenants)) {
      const active = (await statusesOf(id)).filter((s) => s.systemMeaning === 'inactive' && s.active);
      expect(active).toHaveLength(1);
    }
  });
});
