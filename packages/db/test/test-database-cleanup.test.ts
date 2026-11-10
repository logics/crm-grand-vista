import { describe, expect, it } from 'vitest';
import { decideCleanup, type GitView } from './support/test-database.js';

const PR = 139;

function fakeGit(overrides: Partial<GitView> = {}): GitView {
  return {
    hasRef: (ref) => ref === 'main',
    resolveTip: () => 'tip',
    isAncestor: () => true,
    onFirstParent: () => false,
    mergeSubjects: () => [],
    ...overrides,
  };
}

const decide = (
  input: Partial<{ database: string; comment: string | null; current: string }>,
  git = fakeGit(),
) => decideCleanup({ database: 'crm_9_test', comment: 'feat/9-x', current: 'crm_1_test', ...input }, git);

describe('decideCleanup', () => {
  it('mantém bancos protegidos mesmo com o git dizendo "mergeado"', () => {
    expect(decide({ database: 'crm_1_test', current: 'crm_1_test' })).toBe('keep');
    expect(decide({ database: 'crm_test' })).toBe('keep');
    expect(decide({ database: 'crm_dev' })).toBe('keep');
    expect(decide({ database: 'crm_x' })).toBe('keep');
    expect(decide({ database: 'outro_test' })).toBe('keep');
  });

  it('mantém sem comentário ou com comentário vazio', () => {
    expect(decide({ comment: null })).toBe('keep');
    expect(decide({ comment: '  ' })).toBe('keep');
  });

  it('mantém sem ref de base', () => {
    expect(decide({}, fakeGit({ hasRef: () => false }))).toBe('keep');
  });

  it('mantém quando o git lança', () => {
    expect(
      decide({}, fakeGit({ isAncestor: () => { throw new Error('git'); } })),
    ).toBe('keep');
  });

  it('derruba tip ancestral fora do first-parent', () => {
    expect(decide({})).toBe('drop');
  });

  it('mantém tip no first-parent (branch nova, sem commits)', () => {
    expect(decide({}, fakeGit({ onFirstParent: () => true }))).toBe('keep');
  });

  it('mantém tip que não é ancestral', () => {
    expect(decide({}, fakeGit({ isAncestor: () => false }))).toBe('keep');
  });

  describe('branch apagada', () => {
    const gone = (subjects: string[]) => fakeGit({ resolveTip: () => null, mergeSubjects: () => subjects });

    it('derruba com o merge commit da branch', () => {
      expect(decide({ comment: 'feat/129-x' }, gone([`Merge pull request #${PR} from logics/feat/129-x`]))).toBe('drop');
    });

    it('mantém com merge commit de outra branch', () => {
      expect(decide({ comment: 'feat/129-x' }, gone([`Merge pull request #${PR} from logics/feat/129-xy`]))).toBe('keep');
    });

    it('mantém sem merge commit', () => {
      expect(decide({ comment: 'feat/129-x' }, gone(['Merge branch main']))).toBe('keep');
    });
  });
});
