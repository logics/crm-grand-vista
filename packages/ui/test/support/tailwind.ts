import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '@tailwindcss/node';

// Caminho a partir da string de `import.meta.url`: no ambiente jsdom, o `URL`
// global é o do jsdom, que o `fileURLToPath` do Node recusa.
export const srcDir = `${resolve(dirname(fileURLToPath(import.meta.url)), '../../src')}/`;

/**
 * Compila a folha que as aplicações importam (`@crm/ui/styles.css`) pelo mesmo
 * compilador que o plugin do Vite usa. A função devolvida gera o CSS das classes
 * pedidas; o compilador acumula as classes entre chamadas.
 */
export async function compileStyles(): Promise<(candidates: string[]) => string> {
  const compiler = await compile(readFileSync(`${srcDir}styles.css`, 'utf8'), {
    base: srcDir,
    onDependency: () => {},
  });
  return (candidates) => compiler.build(candidates);
}

/** Seletor CSS de uma classe, escapado como o Tailwind o escreve. */
export const classSelector = (className: string) => `.${className.replace(/[^\w-]/g, (char) => `\\${char}`)}`;

/** Se o CSS tem regra para a classe — e não só para uma classe que começa igual (`p-1` × `p-10`). */
export function hasRule(css: string, className: string): boolean {
  const selector = classSelector(className).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
  return new RegExp(`${selector}(?![\\w\\\\-])`).test(css);
}
