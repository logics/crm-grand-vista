import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compile } from '@tailwindcss/node';
import { beforeAll, describe, expect, it } from 'vitest';

// Exercita a folha que as aplicações importam (`@crm/ui/styles.css`), compilada
// pelo mesmo compilador que o plugin do Vite usa.
const srcDir = fileURLToPath(new URL('../src/', import.meta.url));
const tokensDir = `${srcDir}tokens/`;

/** Declarações `--nome: valor` de um trecho de CSS, na ordem em que aparecem. */
function declarations(css: string): [name: string, value: string][] {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...withoutComments.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+?)\s*(?=;|\})/g)].map(([, name, value]) => [
    name!,
    value!,
  ]);
}

const tokenFiles = readdirSync(tokensDir).filter((file) => file.endsWith('.css'));
const tokensByFile = new Map(
  tokenFiles.map((file) => [file, new Map(declarations(readFileSync(tokensDir + file, 'utf8')))]),
);
const tokens = new Map([...tokensByFile.values()].flatMap((fileTokens) => [...fileTokens]));
const namesIn = (file: string) => [...tokensByFile.get(file)!.keys()].map((name) => name.slice(2));

let build: (candidates: string[]) => string;

beforeAll(async () => {
  const compiler = await compile(readFileSync(`${srcDir}styles.css`, 'utf8'), {
    base: srcDir,
    onDependency: () => {},
  });
  build = (candidates) => compiler.build(candidates);
});

/** A regra gerada para uma classe, ou `undefined` se o tema não a conhece. */
function rule(className: string): string | undefined {
  const css = build([className]);
  const selector = `.${className.replace(/[:@]/g, (char) => `\\${char}`)} {`;
  const start = css.indexOf(selector);
  if (start === -1) return undefined;
  return css.slice(start, css.indexOf('}', start) + 1);
}

describe('tokens', () => {
  it('os nove arquivos do export estão no pacote', () => {
    expect(tokenFiles.sort()).toEqual([
      'admin-v2.css',
      'base.css',
      'colors.css',
      'elevation.css',
      'fonts.css',
      'motion.css',
      'radius.css',
      'spacing.css',
      'typography.css',
    ]);
  });

  it('todas as variáveis declaradas nos tokens chegam à folha compilada', () => {
    // 237 linhas de declaração no export; `admin-v2.css` agrupa várias por
    // linha, o que dá 250 variáveis.
    expect(tokens.size).toBe(250);
    const compiled = declarations(build([]));
    const compiledNames = new Set(compiled.map(([name]) => name));
    for (const name of tokens.keys()) expect(compiledNames, name).toContain(name);
  });

  it('carrega a fonte antes de qualquer outra regra', () => {
    const css = build([]);
    const firstRule = css
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trimStart()
      .replace(/^@layer [\w, ]+;\s*/, '');
    expect(firstRule.startsWith('@import url("https://fonts.googleapis.com/')).toBe(true);
  });

  it('o estilo de base dos tokens fica na camada base, abaixo dos utilitários', () => {
    // Sem isso, `body { font-size }` dos tokens venceria `text-h1` aplicado no body.
    const css = build([]);
    const baseRule = css.search(/\bh1\s*\{\s*font-size:\s*var\(--size-h1\)/);
    expect(baseRule).toBeGreaterThan(-1);
    const enclosingLayer = /@layer (\w+) \{/g;
    let layer: string | undefined;
    for (const match of css.slice(0, baseRule).matchAll(enclosingLayer)) layer = match[1];
    expect(layer).toBe('base');
  });
});

describe('tema do Tailwind', () => {
  const semanticColors = namesIn('colors.css').filter((name) => !name.startsWith('gv-'));

  it.each(semanticColors)('cor semântica --%s vira utilitário de cor', (name) => {
    expect(rule(`bg-${name}`)).toContain(`background-color: var(--${name})`);
    expect(rule(`text-${name}`)).toContain(`color: var(--${name})`);
    expect(rule(`border-${name}`)).toContain(`border-color: var(--${name})`);
  });

  it('a paleta crua (--gv-*) não vira utilitário: componentes usam os apelidos semânticos', () => {
    expect(rule('bg-gv-green-700')).toBeUndefined();
    expect(rule('bg-green-700')).toBeUndefined();
  });

  it('o scrim do modal é cor', () => {
    expect(rule('bg-scrim-modal')).toContain('background-color: var(--scrim-modal)');
  });

  it.each(['display', 'sans', 'mono'])('família --font-%s', (name) => {
    expect(rule(`font-${name}`)).toContain(`font-family: var(--font-${name})`);
  });

  it.each(['body', 'heading', 'data', 'brand'])('família por papel --text-%s-font', (role) => {
    expect(rule(`font-${role}`)).toContain(`font-family: var(--text-${role}-font)`);
  });

  const sizes = namesIn('typography.css').filter((name) => name.startsWith('size-'));
  it.each(sizes)('tamanho --%s', (name) => {
    expect(rule(`text-${name.slice('size-'.length)}`)).toContain(`font-size: var(--${name})`);
  });

  const lineHeights = namesIn('typography.css').filter((name) => name.startsWith('lh-'));
  it.each(lineHeights)('entrelinha --%s', (name) => {
    expect(rule(`leading-${name.slice('lh-'.length)}`)).toContain(`line-height: var(--${name})`);
  });

  const weights = namesIn('typography.css').filter((name) => name.startsWith('weight-'));
  it.each(weights)('peso --%s', (name) => {
    expect(rule(`font-${name.slice('weight-'.length)}`)).toContain(`font-weight: var(--${name})`);
  });

  const trackings = namesIn('typography.css').filter((name) => name.startsWith('tracking-'));
  it.each(trackings)('espaçamento entre letras --%s', (name) => {
    expect(rule(name)).toContain(`letter-spacing: var(--${name})`);
  });

  const spaces = namesIn('spacing.css').filter((name) => name.startsWith('space-'));
  it.each(spaces)('escala de espaço --%s', (name) => {
    const step = name.slice('space-'.length);
    expect(rule(`p-${step}`)).toContain(`padding: var(--${name})`);
    expect(rule(`gap-${step}`)).toContain(`gap: var(--${name})`);
  });

  const layout = namesIn('spacing.css').filter((name) => !name.startsWith('space-') && !name.startsWith('bp-'));
  it.each(layout)('medida de layout --%s', (name) => {
    expect(rule(`w-${name}`)).toContain(`width: var(--${name})`);
  });

  it('largura máxima do conteúdo', () => {
    expect(rule('max-w-content-max')).toContain('max-width: var(--content-max)');
  });

  it.each(['rail', 'mobile'])('faixa --bp-%s vira variante de media e de container query', (name) => {
    const width = tokens.get(`--bp-${name}`);
    expect(build([`max-${name}:p-6`])).toContain(`@media (width < ${width})`);
    expect(build([`@max-${name}:p-6`])).toContain(`@container (width < ${width})`);
  });

  it.each(namesIn('radius.css'))('raio --%s', (name) => {
    expect(rule(`rounded-${name.slice('radius-'.length)}`)).toContain(`border-radius: var(--${name})`);
  });

  // `shadow-none` é utilitário fixo do Tailwind, com o mesmo efeito do token.
  const shadows = namesIn('elevation.css').filter((name) => name.startsWith('shadow-') && name !== 'shadow-none');
  it.each(shadows)('sombra --%s', (name) => {
    expect(rule(name)).toContain(`--tw-shadow: var(--${name})`);
  });

  it.each(['ring-focus', 'ring-danger'])('anel --%s é sombra', (name) => {
    expect(rule(`shadow-${name}`)).toContain(`--tw-shadow: var(--${name})`);
  });

  it.each(['scrim-bottom', 'scrim-flat', 'gradient-hero', 'gradient-gold'])('gradiente --%s', (name) => {
    expect(rule(`bg-${name}`)).toContain(`background-image: var(--${name})`);
  });

  const eases = namesIn('motion.css').filter((name) => name.startsWith('ease-'));
  it.each(eases)('curva --%s', (name) => {
    expect(rule(name)).toContain(`transition-timing-function: var(--${name})`);
  });

  const durations = namesIn('motion.css').filter((name) => name.startsWith('dur-'));
  it.each(durations)('duração --%s', (name) => {
    expect(rule(`duration-${name.slice('dur-'.length)}`)).toContain(`transition-duration: var(--${name})`);
  });

  it('o reset e a transição genérica usam os tokens como padrão', () => {
    const css = build(['transition']);
    expect(css).toMatch(/html,\s*:host\s*\{[^}]*font-family:\s*var\(--font-sans\b/);
    expect(css).toMatch(/code,\s*kbd[^{]*\{[^}]*font-family:\s*var\(--font-mono\b/);
    expect(rule('transition')).toContain('var(--dur-fast)');
    expect(rule('transition')).toContain('var(--ease-standard)');
  });

  it('transição padrão de controle', () => {
    expect(rule('transition-control')).toContain('transition: var(--transition-control)');
  });

  it('o tema padrão do Tailwind não existe: só os tokens', () => {
    for (const className of ['bg-red-500', 'text-2xl', 'font-serif', 'shadow-2xl', 'rounded-3xl', 'p-14', 'max-md:p-6']) {
      expect(rule(className), className).toBeUndefined();
    }
  });

  it('o tema não escreve valor à mão: tudo aponta para um token, salvo as faixas, que repetem o token', () => {
    const theme = readFileSync(`${srcDir}theme.css`, 'utf8');
    for (const [name, value] of declarations(theme)) {
      const breakpoint = /^--(?:breakpoint|container)-(.+)$/.exec(name);
      if (breakpoint) {
        // Media query e container query não leem var(): o valor é cópia
        // literal do token, e é aqui que a cópia fica amarrada a ele.
        expect(value, name).toBe(tokens.get(`--bp-${breakpoint[1]}`));
        continue;
      }
      const reference = /^var\((--[\w-]+)\)$/.exec(value);
      expect(reference, `${name}: ${value}`).not.toBeNull();
      expect(tokens.has(reference![1]!), `${name} aponta para ${reference![1]}`).toBe(true);
    }
  });
});
