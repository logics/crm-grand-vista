// Trava de boot do papel da aplicação, forçando a configuração errada de verdade:
// o processo real da API sobe contra o banco de teste com a string de conexão
// apontando para cada papel proibido. É o caso que nenhum outro teste pega —
// alguém editar a string de conexão no servidor e o RLS sumir em silêncio.
import { loadApiEnv, loadMigrationEnv } from '@crm/shared/env';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runApiUntilExit, startApi } from './support/api-process.js';
import { asSuperuser, SUPERUSER_DATABASE_URL, withCredentials } from './support/superuser.js';

const env = loadApiEnv();
const { MIGRATION_DATABASE_URL } = loadMigrationEnv();

const bootEnv = (databaseUrl: string) => ({
  DATABASE_URL: databaseUrl,
  BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
  API_URL: env.API_URL,
  WEB_URL: env.WEB_URL,
});

/** Papéis criados só para este arquivo; o cluster é compartilhado entre bancos. */
const BYPASS_ROLE = 'crm_boot_bypassrls';
const OWNER_MEMBER_ROLE = 'crm_boot_owner_member';
const PASSWORD = 'senha-do-teste-de-boot';

const TEST_ROLES = [BYPASS_ROLE, OWNER_MEMBER_ROLE];

const currentDatabase = async (client: pg.Client) =>
  (await client.query<{ database: string }>('select current_database() as database')).rows[0]?.database;

async function dropTestRoles(): Promise<void> {
  await asSuperuser(async (client) => {
    const database = await currentDatabase(client);
    for (const role of TEST_ROLES) {
      const { rowCount } = await client.query('select 1 from pg_roles where rolname = $1', [role]);
      if (!rowCount) continue;
      await client.query(`revoke all on database ${database} from ${role}`);
      await client.query(`drop role ${role}`);
    }
  });
}

describe('trava de boot do papel da aplicação', () => {
  beforeAll(async () => {
    await dropTestRoles();
    await asSuperuser(async (client) => {
      const database = await currentDatabase(client);
      await client.query(`create role ${BYPASS_ROLE} login password '${PASSWORD}' bypassrls`);
      await client.query(`create role ${OWNER_MEMBER_ROLE} login password '${PASSWORD}' in role crm_owner`);
      for (const role of TEST_ROLES) {
        await client.query(`grant connect on database ${database} to ${role}`);
      }
    });
  });

  afterAll(dropTestRoles);

  it('recusa subir como superusuário', () => {
    const result = runApiUntilExit(bootEnv(SUPERUSER_DATABASE_URL));

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('A API não subiu.');
    expect(result.stderr).toContain('superusuário');
  });

  it('recusa subir com papel que tem BYPASSRLS', () => {
    const result = runApiUntilExit(bootEnv(withCredentials(env.DATABASE_URL, BYPASS_ROLE, PASSWORD)));

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`"${BYPASS_ROLE}"`);
    expect(result.stderr).toContain('BYPASSRLS');
    expect(result.stderr).not.toContain('superusuário');
  });

  it('recusa subir como dono das tabelas (crm_owner)', () => {
    const result = runApiUntilExit(bootEnv(MIGRATION_DATABASE_URL));

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('"crm_owner"');
    expect(result.stderr).toContain('dono de');
    expect(result.stderr).toContain('access_profiles');
  });

  it('recusa subir com papel que herda a posse das tabelas', () => {
    const result = runApiUntilExit(bootEnv(withCredentials(env.DATABASE_URL, OWNER_MEMBER_ROLE, PASSWORD)));

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('dono de');
  });

  it('sobe como crm_app', async () => {
    const api = await startApi(bootEnv(env.DATABASE_URL));
    try {
      const response = await fetch(`${api.url}/health`);

      expect(response.status).toBe(200);
    } finally {
      await api.stop();
    }
  });
});
