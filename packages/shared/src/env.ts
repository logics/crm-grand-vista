// Único arquivo do projeto que lê `process.env`. Todo o resto recebe o objeto
// tipado daqui — é o que faz uma variável faltando virar erro no boot, e não
// `undefined` dentro de uma query em produção.
import { z } from 'zod';

const postgresUrl = z
  .url({ protocol: /^postgres(ql)?$/, error: 'deve ser uma URL postgres://' });

const httpUrl = z.url({ protocol: /^https?$/, error: 'deve ser uma URL http(s)://' });

/** Processo da API. Não inclui a string de migration: a API nunca a lê. */
export const apiEnvSchema = z.object({
  /** Conexão da aplicação, com o papel `crm_app` — sujeito ao RLS. */
  DATABASE_URL: postgresUrl,
  BETTER_AUTH_SECRET: z.string().min(32, 'deve ter ao menos 32 caracteres'),
  API_URL: httpUrl,
  WEB_URL: httpUrl,
  PORT: z.coerce.number().int().positive().default(3000),
});

/** Processo de migration. Conecta com o papel `crm_owner`, dono do schema. */
export const migrationEnvSchema = z.object({
  MIGRATION_DATABASE_URL: postgresUrl,
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;
export type MigrationEnv = z.infer<typeof migrationEnvSchema>;

type EnvSource = Readonly<Record<string, string | undefined>>;

export class InvalidEnvError extends Error {
  constructor(readonly variables: string[], details: string[]) {
    super(`Variáveis de ambiente inválidas:\n${details.map((line) => `  - ${line}`).join('\n')}`);
    this.name = 'InvalidEnvError';
  }
}

export function parseEnv<S extends z.ZodObject>(schema: S, source: EnvSource = process.env): z.infer<S> {
  // Só as chaves que o schema declara; string vazia (`FOO=` no .env) é ausência.
  const input = Object.fromEntries(
    Object.keys(schema.shape).map((name) => [name, source[name] === '' ? undefined : source[name]]),
  );

  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const problems = new Map<string, string>();
  for (const issue of result.error.issues) {
    const name = String(issue.path[0]);
    if (problems.has(name)) continue;
    problems.set(name, input[name] === undefined ? 'ausente' : issue.message);
  }

  throw new InvalidEnvError(
    [...problems.keys()],
    [...problems].map(([name, problem]) => `${name}: ${problem}`),
  );
}

export const loadApiEnv = (): ApiEnv => parseEnv(apiEnvSchema);
export const loadMigrationEnv = (): MigrationEnv => parseEnv(migrationEnvSchema);
