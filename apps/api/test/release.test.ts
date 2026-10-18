import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LOCAL_VERSION, readReleaseVersion } from '../src/release.js';

const tempFile = (content: string) => {
  const path = join(mkdtempSync(join(tmpdir(), 'release-')), 'release.json');
  writeFileSync(path, content);
  return path;
};

describe('versão do release', () => {
  it('lê a versão gravada pelo deploy', () => {
    expect(readReleaseVersion(tempFile('{"version":"4f1c2ab"}'))).toBe('4f1c2ab');
  });

  it('é a versão local fora de um release', () => {
    expect(readReleaseVersion(join(tmpdir(), 'nao-existe', 'release.json'))).toBe(LOCAL_VERSION);
  });

  it('recusa arquivo de release sem versão', () => {
    expect(() => readReleaseVersion(tempFile('{}'))).toThrow(/release\.json/);
  });
});
