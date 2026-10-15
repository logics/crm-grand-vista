import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { cn } from '../../src/lib/cn.js';

// O tailwind-merge só sabe que `text-h1` é tamanho e `text-text-body` é cor se
// conhecer as escalas do tema. As escalas vêm do `theme.css`, para que um token
// novo sem registro no `cn` quebre aqui, e não em silêncio num componente.
const theme = readFileSync(fileURLToPath(new URL('../../src/theme.css', import.meta.url)), 'utf8');

/** Sufixos declarados no tema para um namespace: `--text-h1` → `h1`. */
function themeKeys(namespace: string): string[] {
  const pattern = new RegExp(`^\\s*--${namespace}-([\\w-]+)\\s*:`, 'gm');
  return [...theme.matchAll(pattern)].map(([, key]) => key!);
}

describe('cn', () => {
  it('junta classes e descarta valores falsos', () => {
    expect(cn('p-6', false, undefined, null, 'gap-4')).toBe('p-6 gap-4');
  });

  it.each(themeKeys('text'))('text-%s é tamanho: convive com a cor e cede a outro tamanho', (key) => {
    expect(cn(`text-${key}`, 'text-text-body')).toBe(`text-${key} text-text-body`);
    expect(cn(`text-${key}`, 'text-micro')).toBe('text-micro');
  });

  it('cor de texto substitui cor de texto', () => {
    expect(cn('text-text-muted', 'text-text-heading')).toBe('text-text-heading');
  });

  it.each(themeKeys('font-weight'))('font-%s é peso: convive com a família', (key) => {
    expect(cn(`font-${key}`, 'font-mono')).toBe(`font-${key} font-mono`);
    expect(cn(`font-${key}`, 'font-bold')).toBe('font-bold');
  });

  it.each(themeKeys('font'))('font-%s é família: cede a outra família', (key) => {
    expect(cn(`font-${key}`, 'font-display')).toBe('font-display');
  });

  it.each(themeKeys('leading'))('leading-%s é entrelinha', (key) => {
    expect(cn(`leading-${key}`, 'leading-tight')).toBe('leading-tight');
  });

  it.each(themeKeys('tracking'))('tracking-%s é espaçamento entre letras', (key) => {
    expect(cn(`tracking-${key}`, 'tracking-tight')).toBe('tracking-tight');
  });

  it.each(themeKeys('spacing'))('%s é medida de espaço', (key) => {
    expect(cn(`p-${key}`, 'p-6')).toBe('p-6');
    expect(cn(`h-${key}`, 'h-control-height')).toBe('h-control-height');
  });

  it.each(themeKeys('radius'))('rounded-%s é raio', (key) => {
    expect(cn(`rounded-${key}`, 'rounded-card')).toBe('rounded-card');
  });

  it.each(themeKeys('shadow'))('shadow-%s é sombra, e não cor de sombra', (key) => {
    expect(cn(`shadow-${key}`, 'shadow-none')).toBe('shadow-none');
  });

  it.each(themeKeys('ease'))('ease-%s é curva', (key) => {
    expect(cn(`ease-${key}`, 'ease-standard')).toBe('ease-standard');
  });

  it.each(themeKeys('transition-duration'))('duration-%s é duração', (key) => {
    expect(cn(`duration-${key}`, 'duration-slow')).toBe('duration-slow');
  });

  it('a classe passada pelo consumidor vence a do componente', () => {
    expect(cn('bg-surface-card rounded-md', 'bg-surface-sunken')).toBe('rounded-md bg-surface-sunken');
  });
});
