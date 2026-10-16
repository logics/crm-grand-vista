// Endpoint de saúde: o que o painel e o monitoramento consultam, sem
// autenticação. É superfície pública — responde versão e se o banco atende, e
// nada que ajude a mapear a infraestrutura.
import { createDatabase, createPool } from '@crm/db';
import { loadApiEnv, loadMigrationEnv } from '@crm/shared/env';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { createAuth } from '../src/modules/auth/auth.js';

const env = loadApiEnv();

/** Tudo que identifica o banco nas duas strings de conexão do ambiente. */
function infrastructureDetails(): string[] {
  return [env.DATABASE_URL, loadMigrationEnv().MIGRATION_DATABASE_URL].flatMap((connectionString) => {
    const url = new URL(connectionString);
    return [url.hostname, url.port, url.username, url.pathname.slice(1)];
  });
}

function buildApp(databaseUrl: string) {
  const pool = createPool(databaseUrl);
  const db = createDatabase(pool);
  return { app: createApp({ auth: createAuth({ db, env }), db, env }), pool };
}

describe('GET /health', () => {
  const healthy = buildApp(env.DATABASE_URL);
  // Porta 1: nada escuta ali, a conexão é recusada na hora.
  const unreachable = buildApp('postgres://crm_app:senha@127.0.0.1:1/crm_fora_do_ar');

  afterAll(() => Promise.all([healthy.pool.end(), unreachable.pool.end()]));

  it('responde ok, com a versão, quando o banco atende', async () => {
    const response = await healthy.app.request('/health');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok', version: expect.any(String), database: 'ok' });
  });

  it('responde 503 quando o banco não atende', async () => {
    const response = await unreachable.app.request('/health');

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: 'unavailable', version: expect.any(String), database: 'unavailable' });
  });

  it.each([
    ['com o banco no ar', healthy, infrastructureDetails()],
    ['com o banco fora do ar', unreachable, ['127.0.0.1', 'crm_fora_do_ar', 'crm_app', 'ECONNREFUSED']],
  ])('não revela banco, papel nem host %s', async (_label, { app }, details) => {
    const response = await app.request('/health');
    const exposed = `${JSON.stringify([...response.headers])}${await response.text()}`;

    for (const detail of details.filter((item) => item !== '')) {
      expect(exposed).not.toContain(detail);
    }
  });
});
