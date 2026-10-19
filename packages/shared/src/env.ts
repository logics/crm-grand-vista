// Único arquivo do projeto que lê `process.env`. Todo o resto recebe o objeto
// tipado daqui — é o que faz uma variável faltando virar erro no boot, e não
// `undefined` dentro de uma query em produção.
import { z } from 'zod';

// `@__PURE__`: o front importa este módulo pelo `webEnvSchema`, e sem a marca
// o bundler mantém os schemas da API no bundle do navegador, sem ninguém usá-los.
const postgresUrl = /* @__PURE__ */ z
  .url({ protocol: /^postgres(ql)?$/, error: 'deve ser uma URL postgres://' });

const httpUrl = z.url({ protocol: /^https?$/, error: 'deve ser uma URL http(s)://' });

/** Processo da API. Não inclui a string de migration: a API nunca a lê. */
export const apiEnvSchema = /* @__PURE__ */ z.object({
  /** Conexão da aplicação, com o papel `crm_app` — sujeito ao RLS. */
  DATABASE_URL: postgresUrl,
  BETTER_AUTH_SECRET: z.string().min(32, 'deve ter ao menos 32 caracteres'),
  API_URL: httpUrl,
  WEB_URL: httpUrl,
  PORT: z.coerce.number().int().positive().default(3000),
});

/** Processo de migration. Conecta com o papel `crm_owner`, dono do schema. */
export const migrationEnvSchema = /* @__PURE__ */ z.object({
  MIGRATION_DATABASE_URL: postgresUrl,
});

/**
 * Scripts de CLI da API (provisionamento, super admin). Conectam como `crm_app`,
 * como a API: o RLS vale para eles também.
 */
export const cliEnvSchema = /* @__PURE__ */ apiEnvSchema.pick({ DATABASE_URL: true });

/**
 * Build do front. Tudo o que entra aqui vai parar no bundle, legível por
 * qualquer visitante: só endereço público, nunca segredo. O Vite expõe só as
 * variáveis com prefixo `VITE_`; o front as lê de `import.meta.env`, não do processo.
 */
export const webEnvSchema = z.object({
  /** URL base pública da API, a mesma de `API_URL`. */
  VITE_API_URL: httpUrl,
});

/**
 * E2E contra produção (`playwright.production.config.ts`): a URL publicada do
 * front e a conta de verificação, numa empresa própria. Vêm do environment
 * `production` do GitHub; a senha é segredo.
 */
export const e2eProductionEnvSchema = /* @__PURE__ */ z.object({
  E2E_BASE_URL: httpUrl,
  E2E_USER_NAME: z.string(),
  E2E_USER_EMAIL: z.email({ error: 'deve ser um e-mail' }),
  E2E_USER_PASSWORD: z.string(),
  E2E_TENANT_SLUG: z.string(),
  E2E_TENANT_NAME: z.string(),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;
export type CliEnv = z.infer<typeof cliEnvSchema>;
export type MigrationEnv = z.infer<typeof migrationEnvSchema>;
export type WebEnv = z.infer<typeof webEnvSchema>;
export type E2EProductionEnv = z.infer<typeof e2eProductionEnvSchema>;

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

/**
 * Carrega um arquivo `.env` para o ambiente do processo, se ele existir, sem
 * sobrescrever o que o processo já recebeu. É como a API de produção lê o
 * `shared/.env` do servidor (dono root, legível só pelo usuário da API), em
 * vez de receber os segredos pelo painel. A validação continua sendo a de
 * `parseEnv`.
 */
export function loadEnvFileIfPresent(path: string): void {
  try {
    process.loadEnvFile(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

export const loadApiEnv = (): ApiEnv => parseEnv(apiEnvSchema);
export const loadMigrationEnv = (): MigrationEnv => parseEnv(migrationEnvSchema);
export const loadCliEnv = (): CliEnv => parseEnv(cliEnvSchema);
export const loadE2EProductionEnv = (): E2EProductionEnv => parseEnv(e2eProductionEnvSchema);
