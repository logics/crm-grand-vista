// `pnpm dev` roda via turbo 2, que no modo padrão (strict) não repassa as variáveis
// do shell às tarefas. Sem `--env-mode=loose`, a API sobe sem DATABASE_URL & cia
// quando o ambiente vem do shell e não há `.env` na raiz.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
const turbo = JSON.parse(read('turbo.json')) as { envMode?: string };

describe('script dev da raiz', () => {
  it('usa turbo com --env-mode=loose para encaminhar o ambiente do shell', () => {
    expect(pkg.scripts.dev).toMatch(/^turbo run dev\b.*--env-mode=loose\b/);
  });

  it('não muda o modo de ambiente global do turbo (afetaria hash de build e typecheck)', () => {
    expect(turbo.envMode).toBeUndefined();
  });
});
