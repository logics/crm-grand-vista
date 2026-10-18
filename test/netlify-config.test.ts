// Config do front no Netlify. O que ela garante só se vê em produção — abrir
// `/e/<empresa>/` direto na URL —, então a regra é presa aqui, no arquivo.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const netlifyToml = read('netlify.toml');

/** Valor de `chave = "valor"` dentro de uma seção `[seção]` do TOML. */
function setting(section: string, key: string): string | undefined {
  const body = netlifyToml.split(/^\[/m).find((block) => block.startsWith(`${section}]`));
  return body?.match(new RegExp(`^\\s*${key}\\s*=\\s*"([^"]*)"`, 'm'))?.[1];
}

describe('netlify.toml', () => {
  it('compila o front a partir de apps/web, instalando na raiz do workspace', () => {
    expect(setting('build', 'base')).toBe('apps/web');
    expect(setting('build', 'publish')).toBe('dist');
    expect(setting('build', 'command')).toMatch(/^pnpm --dir \.\.\/\.\. install --frozen-lockfile && /);
  });

  it('reescreve toda rota para o index.html (SPA), com status 200', () => {
    const redirects = netlifyToml.split(/^\[\[redirects\]\]/m).slice(1);

    expect(redirects).toHaveLength(1);
    expect(redirects[0]).toMatch(/^\s*from\s*=\s*"\/\*"\s*$/m);
    expect(redirects[0]).toMatch(/^\s*to\s*=\s*"\/index\.html"\s*$/m);
    expect(redirects[0]).toMatch(/^\s*status\s*=\s*200\s*$/m);
  });

  it('usa a mesma versão do Node do .nvmrc', () => {
    expect(setting('build.environment', 'NODE_VERSION')).toBe(read('.nvmrc').trim());
  });
});
