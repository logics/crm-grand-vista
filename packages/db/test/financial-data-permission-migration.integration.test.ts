// A migration `0027_financial_data_permission` contra o Postgres real: concede
// `contatos.ver_dados_financeiros` aos perfis SEMEADOS Admin e Gestor da empresa
// existente; aplicar **duas vezes** não duplica; perfil semeado renomeado, perfil
// criado à mão com o nome e o Corretor não a recebem.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadMigrationEnv } from '@crm/shared/env';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MIGRATIONS_FOLDER } from '../src/migrate.js';

const owner = new pg.Client({ connectionString: loadMigrationEnv().MIGRATION_DATABASE_URL });
const migration = readFileSync(join(MIGRATIONS_FOLDER, '0027_financial_data_permission.sql'), 'utf8');
const [permissionSql, grantSql] = migration.split('--> statement-breakpoint').map((part) => part.trim());
const CODE = 'contatos.ver_dados_financeiros';

describe('migration da permissão de dados financeiros em empresa existente', () => {
  const tenantId = '0197c000-0000-7000-8000-000000000027';

  const profiles = [
    { name: 'Admin', seeded: true },
    { name: 'Gestor', seeded: true },
    { name: 'Corretor', seeded: true },
    { name: 'Gestor Sênior', seeded: true }, // semeado, depois renomeado
    { name: 'Gestor Manual', seeded: false }, // criado à mão, não semeado: não recebe
  ];

  const holders = async (): Promise<string[]> => {
    await owner.query(`select set_config('app.tenant_id', $1, false)`, [tenantId]);
    const { rows } = await owner.query(
      `select p.name || case when p.is_seeded then '' else ' (à mão)' end as label, count(*)::int as n
         from profile_permissions pp join access_profiles p on p.id = pp.profile_id
        where pp.permission_code = $1 group by p.id, p.name, p.is_seeded order by label`,
      [CODE],
    );
    return rows.map((row) => `${row.label}:${row.n}`);
  };

  beforeAll(async () => {
    await owner.connect();
    await owner.query(
      `insert into tenants (id, slug, name) values ($1, 'antiga-dados-financeiros', 'Antiga') on conflict do nothing`,
      [tenantId],
    );
    await owner.query(`select set_config('app.tenant_id', $1, false)`, [tenantId]);
    for (const { name, seeded } of profiles) {
      await owner.query(`insert into access_profiles (id, tenant_id, name, is_seeded) values (uuidv7(), $1, $2, $3)`, [
        tenantId,
        name,
        seeded,
      ]);
    }
    // Num banco zerado a migration roda antes da sincronização do catálogo: o teste
    // parte de "ainda não concedida", mas a permissão já existe (a migration 0027 já foi aplicada).
    await owner.query(`delete from profile_permissions where permission_code = $1`, [CODE]);
  });

  afterAll(async () => {
    await owner.query(`select set_config('app.tenant_id', $1, false)`, [tenantId]);
    await owner.query(`delete from access_profiles`);
    await owner.query(`delete from tenants where id = $1`, [tenantId]);
    await owner.end();
  });

  it('a migration insere a permissão do catálogo (existe antes da sincronização)', () => {
    expect(permissionSql).toContain(`'${CODE}'`);
    expect(permissionSql).toMatch(/ON CONFLICT \("code"\) DO NOTHING/);
  });

  it('concede a Admin e Gestor semeados, poupa Corretor e os renomeados, e aplicar duas vezes não duplica', async () => {
    await owner.query(permissionSql!);
    await owner.query(grantSql!);
    await owner.query(permissionSql!);
    await owner.query(grantSql!);

    expect(await holders()).toEqual(['Admin:1', 'Gestor:1']);
  });
});
