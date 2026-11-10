// Nome do banco de teste do checkout. Puro + git síncrono, só builtins do Node:
// o `vitest.config.ts` importa este arquivo antes de qualquer dependência do
// workspace estar disponível.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

export const SHARED_TEST_DATABASE = 'crm_test';

// 63 bytes (limite de identificador do Postgres) − `crm_` − `_test`.
const MAX_SLUG_LENGTH = 54;

type Run = (file: string, args: string[], options: { cwd: string; encoding: 'utf8'; stdio: 'pipe' }) => string;

/** Nome do banco de teste: `crm_test` no CI, em `main` ou sem branch; senão derivado da branch. */
export function testDatabaseName({ ci, branch }: { ci: boolean; branch: string | null }): string {
  if (ci || branch === null || branch === 'main') return SHARED_TEST_DATABASE;

  const issue = /^[^/]+\/(\d+)-/.exec(branch);
  if (issue) return `crm_${issue[1]}_test`;

  let slug = branch
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  if (slug === '') return SHARED_TEST_DATABASE;
  // `crm_test_<n>` era o padrão antigo e nunca pode ser gerado.
  if (slug === 'test' || slug.startsWith('test_')) slug = `b_${slug}`;
  if (Buffer.byteLength(slug) > MAX_SLUG_LENGTH) {
    const hash = createHash('sha1').update(branch).digest('hex').slice(0, 8);
    slug = `${slug.slice(0, 45).replace(/_$/, '')}_${hash}`;
  }
  return `crm_${slug}_test`;
}

/** Branch do checkout, ou `null` se o git falhar ou a HEAD estiver destacada. */
export function currentBranch(cwd: string, run: Run = execFileSync as Run): string | null {
  try {
    const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd, encoding: 'utf8', stdio: 'pipe' }).trim();
    return branch === '' || branch === 'HEAD' ? null : branch;
  } catch {
    return null;
  }
}

/** A mesma URL com outro banco: troca só o pathname e preserva credenciais, host, porta e query. */
export function withDatabase(url: string, name: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${name}`;
  return parsed.toString();
}

export function resolveTestDatabase({
  env,
  cwd,
  run,
}: {
  env: Record<string, string | undefined>;
  cwd: string;
  run?: Run;
}): { name: string; branch: string | null } {
  const branch = currentBranch(cwd, run);
  return { name: testDatabaseName({ ci: env.CI !== undefined, branch }), branch };
}
