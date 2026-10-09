// Só o módulo de ambiente lê o ambiente do processo. Qualquer outro acesso
// escapa da validação do boot e vira `undefined` em produção.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const ENV_MODULE = 'packages/shared/src/env.ts';
const PROJECT_DIRS = ['apps', 'packages', 'e2e', 'test', 'tools'];
const IGNORED_DIRS = new Set(['node_modules', 'dist', '.turbo']);
const CODE_FILE = /\.(?:[cm]?[jt]sx?)$/;

function listCodeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const path = join(dir, item.name);
    if (item.isDirectory()) return IGNORED_DIRS.has(item.name) ? [] : listCodeFiles(path);
    return CODE_FILE.test(item.name) ? [path] : [];
  });
}

describe('leitura do ambiente', () => {
  it('acontece só no módulo de ambiente', () => {
    const atRoot = readdirSync(rootDir).filter((name) => CODE_FILE.test(name)).map((name) => join(rootDir, name));
    const allFiles = [...atRoot, ...PROJECT_DIRS.flatMap((dir) => listCodeFiles(join(rootDir, dir)))];

    const offenders = allFiles
      .map((path) => relative(rootDir, path))
      .filter((path) => path !== ENV_MODULE)
      .filter((path) => /\bprocess\.env\b/.test(readFileSync(join(rootDir, path), 'utf8')));

    expect(allFiles.map((c) => relative(rootDir, c))).toContain(ENV_MODULE);
    expect(offenders).toEqual([]);
  });
});
