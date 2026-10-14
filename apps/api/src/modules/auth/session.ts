// Leitura da sessão corrente, compartilhada entre a rota `/auth/session` e a
// resolução da empresa ativa: as duas respondem o mesmo 401.
import type { Context } from 'hono';
import type { Auth } from './auth.js';

/** Repassa ao navegador os cookies que o Better Auth emitiu ou mandou apagar. */
export function forwardCookies(c: Context, headers: Headers): void {
  for (const cookie of headers.getSetCookie()) c.header('Set-Cookie', cookie, { append: true });
}

/**
 * Sessão válida da requisição, ou nulo. Repassa os cookies que a biblioteca
 * renovar no caminho.
 */
export async function readSession(auth: Auth, c: Context) {
  const { headers, response: session } = await auth.api.getSession({
    headers: c.req.raw.headers,
    returnHeaders: true,
  });

  if (session) forwardCookies(c, headers);
  return session;
}

export const unauthenticated = (c: Context) =>
  c.json({ error: { code: 'unauthenticated', message: 'Sessão ausente ou expirada.' } }, 401);
