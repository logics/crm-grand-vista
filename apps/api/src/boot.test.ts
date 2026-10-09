// Sobe o processo real da API, do mesmo jeito que produção, sem as variáveis
// de ambiente. Não chega a abrir porta nem conectar no banco: falha antes.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const apiDir = fileURLToPath(new URL('..', import.meta.url));

const fullEnv = {
  DATABASE_URL: 'postgres://crm_app:senha@localhost:5432/crm_dev',
  BETTER_AUTH_SECRET: 'x'.repeat(32),
  API_URL: 'http://localhost:3000',
  WEB_URL: 'http://localhost:5173',
};

function startApi(env: Record<string, string>) {
  return spawnSync(
    process.execPath,
    ['--conditions=@crm/source', '--import', 'tsx', 'src/index.ts'],
    { cwd: apiDir, env, encoding: 'utf8', timeout: 20_000 },
  );
}

describe('boot da API', () => {
  it.each(Object.keys(fullEnv))('não sobe sem %s e diz qual variável falta', (name) => {
    const { [name]: _removed, ...withoutOne } = fullEnv as Record<string, string>;

    const result = startApi(withoutOne);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`${name}: ausente`);
  });
});
