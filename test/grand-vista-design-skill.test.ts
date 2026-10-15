// A skill `grand-vista-design` faz o agente que mexe em UI carregar as regras
// da marca. Ela só serve se apontar para arquivos que existem: caminho citado
// que some numa reorganização a transforma em instrução para o vazio.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const skillPath = join(rootDir, '.claude/skills/grand-vista-design/SKILL.md');
const skill = existsSync(skillPath) ? readFileSync(skillPath, 'utf8') : '';

/** Caminhos do repositório citados entre crases: têm barra ou extensão de arquivo. */
const citedPaths = [...skill.matchAll(/`([^`\s]+)`/g)]
  .map(([, path]) => path!)
  .filter((path) => path.includes('/') || /\.\w+$/.test(path))
  .filter((path) => !path.startsWith('@') && !path.includes('*') && !path.includes('<'));

describe('skill grand-vista-design', () => {
  it('está instalada em .claude/skills e se identifica pelo nome', () => {
    expect(skill).toMatch(/^---\nname: grand-vista-design\n/);
    expect(skill).toMatch(/^description: .+$/m);
  });

  it('aponta para a referência visual do Design System', () => {
    expect(citedPaths).toContain('design-system/referencia/README.md');
  });

  it.each(citedPaths)('%s existe', (path) => {
    expect(existsSync(join(rootDir, path))).toBe(true);
  });
});
