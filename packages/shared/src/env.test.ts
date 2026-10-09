import { describe, expect, it } from 'vitest';
import { apiEnvSchema, InvalidEnvError, migrationEnvSchema, parseEnv } from './env.js';

const validApiEnv = {
  DATABASE_URL: 'postgres://crm_app:senha@localhost:5432/crm_dev',
  BETTER_AUTH_SECRET: 'x'.repeat(32),
  API_URL: 'http://localhost:3000',
  WEB_URL: 'http://localhost:5173',
};

function catchEnvError(fn: () => unknown): InvalidEnvError {
  try {
    fn();
  } catch (error) {
    if (error instanceof InvalidEnvError) return error;
    throw error;
  }
  throw new Error('esperava InvalidEnvError, nada foi lançado');
}

describe('parseEnv', () => {
  it('devolve o objeto tipado quando todas as variáveis são válidas', () => {
    const env = parseEnv(apiEnvSchema, validApiEnv);

    expect(env.DATABASE_URL).toBe(validApiEnv.DATABASE_URL);
    expect(env.PORT).toBe(3000);
  });

  it.each(Object.keys(validApiEnv))('nomeia %s quando ela está ausente', (name) => {
    const { [name]: _removed, ...withoutOne } = validApiEnv as Record<string, string>;

    const error = catchEnvError(() => parseEnv(apiEnvSchema, withoutOne));

    expect(error.variables).toEqual([name]);
    expect(error.message).toContain(name);
    expect(error.message).toContain('ausente');
  });

  it('trata string vazia como ausente', () => {
    const error = catchEnvError(() => parseEnv(apiEnvSchema, { ...validApiEnv, API_URL: '' }));

    expect(error.variables).toEqual(['API_URL']);
    expect(error.message).toContain('ausente');
  });

  it('nomeia todas as variáveis com problema de uma vez', () => {
    const error = catchEnvError(() =>
      parseEnv(apiEnvSchema, { ...validApiEnv, WEB_URL: 'não é url', BETTER_AUTH_SECRET: 'curto' }),
    );

    expect(error.variables.sort()).toEqual(['BETTER_AUTH_SECRET', 'WEB_URL']);
  });

  it('recusa string de conexão que não é postgres', () => {
    const error = catchEnvError(() =>
      parseEnv(apiEnvSchema, { ...validApiEnv, DATABASE_URL: 'mysql://localhost/crm' }),
    );

    expect(error.variables).toEqual(['DATABASE_URL']);
  });

  it('não exige a string de migration no ambiente da API', () => {
    expect(apiEnvSchema.shape).not.toHaveProperty('MIGRATION_DATABASE_URL');
    expect(Object.keys(migrationEnvSchema.shape)).toEqual(['MIGRATION_DATABASE_URL']);
  });

  it('ignora variáveis que o schema não declara', () => {
    const env = parseEnv(migrationEnvSchema, {
      MIGRATION_DATABASE_URL: 'postgres://crm_owner:senha@localhost:5432/crm_dev',
      OUTRA: 'qualquer',
    });

    expect(env).toEqual({
      MIGRATION_DATABASE_URL: 'postgres://crm_owner:senha@localhost:5432/crm_dev',
    });
  });
});
