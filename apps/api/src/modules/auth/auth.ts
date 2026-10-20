// Instância do Better Auth: e-mail e senha, sessão em cookie `httpOnly`
// guardada em `sessions`. A biblioteca é usada por `auth.api`, nunca montada
// como handler HTTP — as rotas expostas são as de `routes.ts`.
import { uuidv7, type Database } from '@crm/db';
import type { ApiEnv } from '@crm/shared/env';
import { betterAuth } from 'better-auth';
import { createAuthDatabaseAdapter } from './database-adapter.js';

interface AuthDependencies {
  db: Database;
  env: Pick<ApiEnv, 'API_URL' | 'WEB_URL' | 'BETTER_AUTH_SECRET'>;
}

export function createAuth({ db, env }: AuthDependencies) {
  return betterAuth({
    baseURL: env.API_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.WEB_URL],
    database: createAuthDatabaseAdapter(db),
    // Mesma chave das demais tabelas: UUIDv7 gerado na aplicação.
    advanced: { database: { generateId: () => uuidv7() } },
    // Usuário nasce pelo CLI de provisionamento; não existe autoatendimento.
    emailAndPassword: { enabled: true, disableSignUp: true },
    telemetry: { enabled: false },
  });
}

export type Auth = ReturnType<typeof createAuth>;
