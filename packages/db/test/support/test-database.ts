// Cria/reforça o banco de teste do checkout e derruba os de branches já
// mergeadas. Nunca imprime URL; nunca usa rede (`fetch`, `gh`).
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { withDatabase } from './test-database-name.js';

const PUBLIC_SCHEMA_SQL = new URL('../../sql/public-schema.sql', import.meta.url);
const NAME_PATTERN = /^[a-z0-9_]+_test$/;
const CLEANUP_NAME_PATTERN = /^crm_[a-z0-9_]+_test$/;

type Log = (message: string) => void;

async function withSuperuser<T>(url: string, fn: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export async function ensureTestDatabase({
  superuserUrl,
  name,
  branch,
  log = console.log,
}: {
  superuserUrl: string;
  name: string;
  branch: string | null;
  log?: Log;
}): Promise<void> {
  if (!NAME_PATTERN.test(name)) throw new Error(`Nome de banco de teste inválido: "${name}".`);

  const created = await withSuperuser(withDatabase(superuserUrl, 'postgres'), async (client) => {
    const ident = client.escapeIdentifier(name);
    const { rowCount } = await client.query('select 1 from pg_database where datname = $1', [name]);
    let created = false;
    if (rowCount === 0) {
      try {
        await client.query(`create database ${ident} owner crm_owner`);
        created = true;
      } catch (error) {
        // Corrida com outra execução: o banco já existe.
        if ((error as { code?: string }).code !== '42P04') throw error;
      }
    }
    await client.query(`revoke all on database ${ident} from public`);
    await client.query(`grant connect, temporary on database ${ident} to crm_owner`);
    await client.query(`grant connect on database ${ident} to crm_app`);
    if (name !== 'crm_test' && branch !== null) {
      await client.query(`comment on database ${ident} is ${client.escapeLiteral(branch)}`);
    }
    return created;
  });

  if (created) {
    log(`banco de teste criado: ${name}`);
    await withSuperuser(withDatabase(superuserUrl, name), async (client) => {
      await client.query(await readFile(PUBLIC_SCHEMA_SQL, 'utf8'));
    });
  } else {
    log(`banco de teste existente: ${name}`);
  }
}

export interface GitView {
  hasRef(ref: string): boolean;
  /** Tip da branch (local, senão `origin/`), ou `null` se não existir. */
  resolveTip(branch: string): string | null;
  isAncestor(tip: string, ref: string): boolean;
  onFirstParent(tip: string, ref: string): boolean;
  mergeSubjects(ref: string): string[];
}

type Run = (file: string, args: string[], options: { cwd: string; encoding: 'utf8'; stdio: 'pipe' }) => string;

export function localGit(cwd: string, run: Run = execFileSync as Run): GitView {
  const git = (...args: string[]) => run('git', args, { cwd, encoding: 'utf8', stdio: 'pipe' });
  const succeeds = (...args: string[]): boolean => {
    try {
      git(...args);
      return true;
    } catch (error) {
      // `merge-base --is-ancestor` sai com 1 para "não é"; outro status é erro.
      if ((error as { status?: number }).status === 1) return false;
      throw error;
    }
  };
  const resolve = (ref: string): string | null => {
    try {
      return git('rev-parse', '--verify', '--quiet', `${ref}^{commit}`).trim() || null;
    } catch {
      return null;
    }
  };
  return {
    hasRef: (ref) => resolve(ref) !== null,
    resolveTip: (branch) => resolve(`refs/heads/${branch}`) ?? resolve(`refs/remotes/origin/${branch}`),
    isAncestor: (tip, ref) => succeeds('merge-base', '--is-ancestor', tip, ref),
    onFirstParent: (tip, ref) =>
      git('rev-list', '--first-parent', ref)
        .split('\n')
        .includes(tip),
    mergeSubjects: (ref) => git('log', '--merges', '--format=%s', ref).split('\n'),
  };
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Mantém por padrão; só derruba com prova local de que a branch foi mergeada. */
export function decideCleanup(
  { database, comment, current }: { database: string; comment: string | null; current: string },
  git: GitView,
): 'drop' | 'keep' {
  if (!CLEANUP_NAME_PATTERN.test(database)) return 'keep';
  if (database === 'crm_test' || database === 'crm_dev' || database === current) return 'keep';
  const branch = comment?.trim();
  if (!branch) return 'keep';

  try {
    const base = ['main', 'origin/main'].find((ref) => git.hasRef(ref));
    if (base === undefined) return 'keep';

    const tip = git.resolveTip(branch);
    if (tip !== null) {
      return git.isAncestor(tip, base) && !git.onFirstParent(tip, base) ? 'drop' : 'keep';
    }
    const merged = new RegExp(`^Merge pull request #\\d+ from [^/\\s]+/${escapeRegExp(branch)}$`);
    return git.mergeSubjects(base).some((subject) => merged.test(subject)) ? 'drop' : 'keep';
  } catch {
    return 'keep';
  }
}

export async function cleanupMergedTestDatabases({
  superuserUrl,
  current,
  git,
  log = console.log,
  pattern = 'crm\\_%\\_test',
}: {
  superuserUrl: string;
  current: string;
  git: GitView;
  log?: Log;
  pattern?: string;
}): Promise<void> {
  await withSuperuser(withDatabase(superuserUrl, 'postgres'), async (client) => {
    const { rows } = await client.query<{ datname: string; comment: string | null }>(
      `select datname, shobj_description(oid, 'pg_database') as comment
         from pg_database
        where datname like $1 and not datistemplate
        order by datname`,
      [pattern],
    );
    for (const { datname, comment } of rows) {
      if (decideCleanup({ database: datname, comment, current }, git) === 'keep') continue;
      try {
        await client.query(`drop database ${client.escapeIdentifier(datname)}`);
        log(`banco de teste de branch mergeada removido: ${datname}`);
      } catch (error) {
        if ((error as { code?: string }).code === '3D000') continue;
        log(`banco de teste mantido: ${datname}`);
      }
    }
  });
}
