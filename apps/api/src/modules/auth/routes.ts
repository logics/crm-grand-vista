// Rotas sem empresa: login, logout e sessão corrente. São as únicas fora de
// `/e/:tenant/` — login legitimamente ainda não tem empresa.
import type { Database } from '@crm/db';
import {
  INVALID_CREDENTIALS_MESSAGE,
  loginSchema,
  TOO_MANY_LOGIN_ATTEMPTS_MESSAGE, serializeUser,
  type Session,
} from '@crm/shared';
import { zValidator } from '@hono/zod-validator';
import { APIError } from 'better-auth/api';
import { Hono } from 'hono';
import { noPermissionRequired } from '../../authorization/route-access.js';
import type { Auth } from './auth.js';
import { createLoginRateLimit, type LoginRateLimit } from './login-rate-limit.js';
import { listUserTenants, recordLogin } from './service.js';
import { forwardCookies, readSession, unauthenticated } from './session.js';

interface AuthRoutesDependencies {
  auth: Auth;
  db: Database;
  /** Contador de falhas de login; por padrão, 5 falhas por e-mail a cada 15 minutos. */
  loginRateLimit?: LoginRateLimit;
}

export function createAuthRoutes({
  auth,
  db,
  loginRateLimit = createLoginRateLimit({ maxFailures: 5, windowMs: 15 * 60_000 }),
}: AuthRoutesDependencies) {
  const sessionOf = async (user: Parameters<typeof serializeUser>[0]): Promise<Session> => ({
    user: serializeUser(user),
    tenants: await listUserTenants(db, user.id),
  });

  return new Hono()
    .post('/login', noPermissionRequired, zValidator('json', loginSchema), async (c) => {
      const credentials = c.req.valid('json');

      // Antes de tocar a biblioteca, e igual para e-mail com ou sem conta:
      // o bloqueio vale até para a senha certa e não revela nada.
      const limit = loginRateLimit.check(credentials.email);
      if (limit.blocked) {
        c.header('Retry-After', String(limit.retryAfterSeconds));
        return c.json({ error: { code: 'too_many_attempts', message: TOO_MANY_LOGIN_ATTEMPTS_MESSAGE } }, 429);
      }

      const signIn = await auth.api
        .signInEmail({ body: credentials, headers: c.req.raw.headers, returnHeaders: true })
        .catch((error: unknown) => {
          // Qualquer recusa da biblioteca vira a mesma resposta: o motivo
          // (e-mail inexistente, senha errada, conta sem senha) não sai daqui.
          if (error instanceof APIError && error.statusCode < 500) return null;
          throw error;
        });

      if (!signIn) {
        loginRateLimit.recordFailure(credentials.email);
        return c.json({ error: { code: 'invalid_credentials', message: INVALID_CREDENTIALS_MESSAGE } }, 401);
      }

      loginRateLimit.reset(credentials.email);
      await recordLogin(db, signIn.response.user.id);
      forwardCookies(c, signIn.headers);
      return c.json(await sessionOf(signIn.response.user), 200);
    })
    .post('/logout', noPermissionRequired, async (c) => {
      // Apaga a linha de `sessions`: o cookie guardado por terceiros deixa de valer.
      const { headers } = await auth.api.signOut({ headers: c.req.raw.headers, returnHeaders: true });

      forwardCookies(c, headers);
      return c.body(null, 204);
    })
    .get('/session', noPermissionRequired, async (c) => {
      const session = await readSession(auth, c);
      if (!session) return unauthenticated(c);

      return c.json(await sessionOf(session.user), 200);
    });
}
