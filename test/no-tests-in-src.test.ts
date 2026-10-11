// `src/` guarda só o que vai para produção. Teste e apoio de teste ficam na
// pasta `test/` do pacote, espelhando o caminho do código que exercitam.
import { existsSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const WORKSPACE_DIRS = ['apps', 'packages'];
const TEST_FILE = /\.(?:test|spec)\.[cm]?[jt]sx?$/;
const TEST_DIR = /^(?:__tests__|__mocks__|tests?)$/;

function listTestCode(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const path = join(dir, item.name);
    if (item.isDirectory()) return TEST_DIR.test(item.name) ? [path] : listTestCode(path);
    return TEST_FILE.test(item.name) ? [path] : [];
  });
}

describe('código de teste', () => {
  it('não mora em src/', () => {
    const srcDirs = WORKSPACE_DIRS.flatMap((workspace) =>
      readdirSync(join(rootDir, workspace), { withFileTypes: true })
        .filter((item) => item.isDirectory())
        .map((item) => join(rootDir, workspace, item.name, 'src')),
    ).filter((dir) => existsSync(dir));

    const offenders = srcDirs.flatMap(listTestCode).map((path) => relative(rootDir, path));

    expect(srcDirs.length).toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });
});
