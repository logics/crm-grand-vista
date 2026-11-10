import { describe, expect, it } from 'vitest';
import {
  currentBranch,
  resolveTestDatabase,
  testDatabaseName,
  withDatabase,
} from './support/test-database-name.js';

const name = (branch: string | null, ci = false) => testDatabaseName({ ci, branch });

describe('testDatabaseName', () => {
  it('usa crm_test no CI, mesmo em branch de issue', () => {
    expect(name('feat/129-x', true)).toBe('crm_test');
  });

  it('usa crm_test em main', () => {
    expect(name('main')).toBe('crm_test');
  });

  it('usa crm_test quando o git falhou ou a HEAD está destacada', () => {
    expect(name(null)).toBe('crm_test');
  });

  it('deriva o número da issue da branch', () => {
    expect(name('feat/129-avisos-duplicata')).toBe('crm_129_test');
    expect(name('chore/138-x')).toBe('crm_138_test');
  });

  it('transforma o resto da branch em slug', () => {
    expect(name('chore/test-db-por-issue')).toBe('crm_chore_test_db_por_issue_test');
    expect(name('Feat/Ação  Nova!!')).toBe('crm_feat_a_o_nova_test');
  });

  it('usa crm_test quando o slug fica vazio', () => {
    expect(name('///')).toBe('crm_test');
  });

  it('limita a 63 bytes e é estável em branch enorme', () => {
    const branch = `chore/${'muito-longa-'.repeat(20)}fim`;
    const first = name(branch);
    expect(Buffer.byteLength(first)).toBeLessThanOrEqual(63);
    expect(first).toBe(name(branch));
    expect(first).not.toBe(name(`${branch}x`));
  });

  it('sempre termina em _test e nunca gera crm_test_<n>', () => {
    for (const branch of ['feat/1-a', 'x', 'a/b/c', 'main', 'test/1', null, 'feat/test-9']) {
      const result = name(branch);
      expect(result.endsWith('_test')).toBe(true);
      expect(result).not.toMatch(/^crm_test_/);
    }
  });
});

describe('currentBranch', () => {
  it('devolve null quando o git lança', () => {
    expect(currentBranch('.', () => { throw new Error('sem git'); })).toBeNull();
  });

  it('devolve null com HEAD destacada', () => {
    expect(currentBranch('.', () => 'HEAD\n')).toBeNull();
  });

  it('devolve o nome da branch', () => {
    expect(currentBranch('.', () => 'feat/1-a\n')).toBe('feat/1-a');
  });
});

describe('resolveTestDatabase', () => {
  it('trata CI definido (mesmo vazio) como CI', () => {
    expect(resolveTestDatabase({ env: { CI: '' }, cwd: '.', run: () => 'feat/1-a\n' })).toEqual({
      name: 'crm_test',
      branch: 'feat/1-a',
    });
  });

  it('deriva da branch sem CI', () => {
    expect(resolveTestDatabase({ env: {}, cwd: '.', run: () => 'feat/7-a\n' }).name).toBe('crm_7_test');
  });
});

describe('withDatabase', () => {
  it('troca só o path e preserva credenciais, host, porta e query', () => {
    const result = new URL(withDatabase('postgres://u:p%40ss@h:5433/crm_test?sslmode=disable', 'crm_1_test'));
    expect(result.pathname).toBe('/crm_1_test');
    expect(result.username).toBe('u');
    expect(result.password).toBe('p%40ss');
    expect(result.host).toBe('h:5433');
    expect(result.search).toBe('?sslmode=disable');
  });
});
