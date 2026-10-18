// Saúde da API, sem autenticação: o que o painel e o monitoramento consultam.
// É superfície pública — versão e se o banco atende, nunca nome de banco,
// papel, host ou o erro do driver.
import type { Database } from '@crm/db';
import { Hono } from 'hono';
import { noPermissionRequired } from './authorization/route-access.js';
import { readReleaseVersion } from './release.js';

/** Banco que não responde nesse prazo é banco fora do ar para o monitoramento. */
const DATABASE_TIMEOUT_MS = 3_000;

async function databaseResponds(db: Database): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('O banco não respondeu a tempo.')), DATABASE_TIMEOUT_MS);
  });
  try {
    await Promise.race([db.ping(), timeout]);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function createHealthRoutes({ db }: { db: Database }) {
  const version = readReleaseVersion();

  return new Hono().get('/', noPermissionRequired, async (c) =>
    (await databaseResponds(db))
      ? c.json({ status: 'ok', version, database: 'ok' } as const, 200)
      : c.json({ status: 'unavailable', version, database: 'unavailable' } as const, 503),
  );
}
