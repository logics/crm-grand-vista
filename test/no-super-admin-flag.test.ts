// A flag de super admin não aparece no código que monta respostas. Usuário
// atravessa a borda HTTP só pelos serializadores de `packages/shared`, que não
// a declaram; a API e o front não a nomeiam. Quem precisar lê-la (a resolução
// da permissão efetiva, o CLI) entra na lista nominal abaixo, por revisão.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const SCANNED_DIRS = ['apps/api/src', 'apps/web/src', 'packages/shared/src', 'packages/ui/src'];
/** Arquivos que leem a flag de propósito. Nenhum deles devolve usuário. */
const ALLOWED: readonly string[] = [
  // Resolução da empresa ativa: o super admin entra sem vínculo.
  'apps/api/src/modules/auth/service.ts',
  'apps/api/src/tenant-context.ts',
  // Regra provisória de edição de usuário, até a permissão efetiva (#11).
  'apps/api/src/modules/users/routes.ts',
];
const CODE_FILE = /\.(?:[cm]?[jt]sx?)$/;
const FLAG = /is_?super_?admin/i;

function listCodeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const path = join(dir, item.name);
    if (item.isDirectory()) return item.name === 'node_modules' ? [] : listCodeFiles(path);
    return CODE_FILE.test(item.name) ? [path] : [];
  });
}

/** Comentário pode citar a flag — é onde a regra está escrita. Código, não. */
const withoutComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('flag de super admin', () => {
  const files = SCANNED_DIRS.flatMap((dir) => listCodeFiles(join(rootDir, dir))).map((path) => relative(rootDir, path));

  it('não é nomeada pelo código da API, do front nem dos serializadores', () => {
    const offenders = files
      .filter((path) => !ALLOWED.includes(path))
      .filter((path) => FLAG.test(withoutComments(readFileSync(join(rootDir, path), 'utf8'))));

    expect(files).toContain('packages/shared/src/user.ts');
    expect(offenders).toEqual([]);
  });

  it('a lista nominal não guarda arquivo que deixou de existir', () => {
    expect(ALLOWED.filter((path) => !files.includes(path))).toEqual([]);
  });
});
