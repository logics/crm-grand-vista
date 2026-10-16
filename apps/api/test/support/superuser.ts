// Conexão de superusuário do container, só para a suíte forçar configurações que
// nenhum papel do CRM consegue criar (papel com BYPASSRLS, por exemplo). Vem do
// `.env.test`; produção não tem nem precisa desta variável.
import { parseEnv } from '@crm/shared/env';
import pg from 'pg';
import { z } from 'zod';

const { SUPERUSER_DATABASE_URL } = parseEnv(z.object({ SUPERUSER_DATABASE_URL: z.url() }));

export { SUPERUSER_DATABASE_URL };

/** Executa `fn` com um cliente conectado como superusuário e fecha a conexão. */
export async function asSuperuser<T>(fn: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: SUPERUSER_DATABASE_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/** A mesma URL, com outro usuário e senha. */
export function withCredentials(connectionString: string, user: string, password: string): string {
  const url = new URL(connectionString);
  url.username = user;
  url.password = password;
  return url.toString();
}
