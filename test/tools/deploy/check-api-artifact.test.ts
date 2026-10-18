import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findArtifactProblems } from '../../../tools/deploy/check-api-artifact.js';

/** Monta um workspace e um artefato de mentira, com os caminhos informados. */
function fixture({ artifact = [] as string[] } = {}) {
  const base = mkdtempSync(join(tmpdir(), 'artefato-'));
  const workspace = join(base, 'workspace');
  const out = join(base, 'out');

  const writeJson = (path: string, content: unknown) => {
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, JSON.stringify(content));
  };
  writeJson(join(workspace, 'package.json'), { devDependencies: { vitest: '5.0.3', turbo: '2.11.7' } });
  writeJson(join(workspace, 'apps/api/package.json'), {
    dependencies: { '@crm/db': 'workspace:*', hono: '4.13.13' },
    devDependencies: { pg: '8.23.1', tsx: '4.23.15', '@types/pg': '8.23.1' },
  });
  writeJson(join(workspace, 'packages/db/package.json'), { dependencies: { pg: '8.23.1' } });

  const paths = [
    'package.json',
    'release.json',
    'dist/index.js',
    'node_modules/.pnpm/hono@4.13.13/node_modules/hono/package.json',
    'node_modules/.pnpm/pg@8.23.1/node_modules/pg/package.json',
    'node_modules/.pnpm/@types+pg@8.23.1/node_modules/@types/pg/package.json',
    'node_modules/@crm/db/package.json',
    'node_modules/@crm/db/dist/index.js',
    'node_modules/@crm/db/migrations/0000_inicial.sql',
    ...artifact,
  ];
  for (const path of paths) {
    mkdirSync(join(out, path, '..'), { recursive: true });
    writeFileSync(join(out, path), '');
  }
  return { out, workspace };
}

describe('verificação do artefato da API', () => {
  it('aceita o artefato só com o que produção executa', () => {
    const { out, workspace } = fixture();

    expect(findArtifactProblems(out, workspace)).toEqual([]);
  });

  it.each([
    ['teste', 'test/boot.test.ts', 'test'],
    ['código-fonte', 'src/index.ts', 'src'],
    ['a referência visual', 'design-system/referencia/index.html', 'design-system'],
    ['teste de pacote do workspace', 'node_modules/@crm/db/test/audit.test.ts', 'node_modules/@crm/db/test'],
  ])('recusa %s', (_label, path, offender) => {
    const { out, workspace } = fixture({ artifact: [path] });

    expect(findArtifactProblems(out, workspace)).toEqual([`não deveria estar no artefato: ${offender}`]);
  });

  it('recusa dependência de desenvolvimento, inclusive a de outro pacote do workspace', () => {
    const { out, workspace } = fixture({
      artifact: [
        'node_modules/.pnpm/tsx@4.23.15/node_modules/tsx/package.json',
        'node_modules/.pnpm/vitest@5.0.3_@types+node@22/node_modules/vitest/package.json',
      ],
    });

    expect(findArtifactProblems(out, workspace)).toEqual([
      'dependência de desenvolvimento no artefato: tsx',
      'dependência de desenvolvimento no artefato: vitest',
    ]);
  });

  it.each(['release.json', 'dist', 'node_modules/@crm/db/migrations'])('recusa artefato sem %s', (path) => {
    const { out, workspace } = fixture();
    rmSync(join(out, path), { recursive: true });

    expect(findArtifactProblems(out, workspace)).toEqual([`falta no artefato: ${path}`]);
  });
});
