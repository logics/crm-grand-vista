// Apoio das suítes que falam com a API por HTTP, pelo `app.request` do Hono.

interface Requestable {
  request(path: string, init?: RequestInit): Response | Promise<Response>;
}

interface Credentials {
  email: string;
  password: string;
}

/** O par `nome=valor` de cada cookie emitido, pronto para o header `Cookie`. */
export const cookiesOf = (response: Response): string =>
  response.headers.getSetCookie().map((cookie) => cookie.split(';')[0]).join('; ');

/** Abre uma sessão nova pela rota de login e devolve o header `Cookie` dela. */
export async function loginAs(app: Requestable, { email, password }: Credentials): Promise<string> {
  const response = await app.request('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (response.status !== 200) throw new Error(`O login de ${email} respondeu ${response.status}.`);
  return cookiesOf(response);
}

/** Requisição com corpo JSON e, se houver, o cookie de sessão. */
export const jsonRequest = (method: string, body: unknown, cookie?: string): RequestInit => ({
  method,
  headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
  body: JSON.stringify(body),
});
