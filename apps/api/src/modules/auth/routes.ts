// Rotas sem empresa: login, logout e sessão corrente. São as únicas fora de
// `/e/:tenant/` — login legitimamente ainda não tem empresa.
import type { Database } from '@crm/db';
import { INVALID_CREDENTIALS_MESSAGE, loginSchema, serializeUser, type Session } from '@crm/shared';
import { zValidator } from '@hono/zod-validator';
import { APIError } from 'better-auth/api';
import { Hono } from 'hono';
import { noPermissionRequired } from '../../authorization/route-access.js';
import type { Auth } from './auth.js';
import { listUserTenants, recordLogin } from './service.js';
import { forwardCookies, readSession, unauthenticated } from './session.js';

interface AuthRoutesDependencies {
  auth: Auth;
  db: Database;
}

export function createAuthRoutes({ auth, db }: AuthRoutesDependencies) {
  const sessionOf = async (user: Parameters<typeof serializeUser>[0]): Promise<Session> => ({
    user: serializeUser(user),
    tenants: await listUserTenants(db, user.id),
  });

  return new Hono()
    .post('/login', noPermissionRequired, zValidator('json', loginSchema), async (c) => {
      const signIn = await auth.api
        .signInEmail({ body: c.req.valid('json'), headers: c.req.raw.headers, returnHeaders: true })
        .catch((error: unknown) => {
          // Qualquer recusa da biblioteca vira a mesma resposta: o motivo
          // (e-mail inexistente, senha errada, conta sem senha) não sai daqui.
          if (error instanceof APIError && error.statusCode < 500) return null;
          throw error;
        });

      if (!signIn) {
        return c.json({ error: { code: 'invalid_credentials', message: INVALID_CREDENTIALS_MESSAGE } }, 401);
      }

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
