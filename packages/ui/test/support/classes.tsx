import { render } from '@testing-library/react';
import type { ComponentType } from 'react';
import { beforeAll, describe, expect, it } from 'vitest';
import { compileStyles, hasRule } from './tailwind.js';

// O tema padrão do Tailwind não é importado: classe fora dos tokens (`p-14`,
// `text-2xl`, `bg-red-500`) não gera CSS e falha em silêncio, com o componente
// sem estilo. Cada caso é renderizado — aberto, em cada variante — e toda
// classe que aparece no DOM tem de gerar regra na folha compilada.

/** Classes que não são utilitários: marcadores de grupo, classes de base dos tokens, as que o react-day-picker e o Lucide põem sozinhos. */
const notUtility = /^(?:group(?:\/[\w-]+)?|peer|gv-[\w-]+|rdp-[\w-]+|lucide(?:-[\w-]+)?)$/;

function classesInDocument(): string[] {
  const classes = new Set<string>();
  for (const element of document.querySelectorAll('[class]')) {
    for (const className of element.classList) if (!notUtility.test(className)) classes.add(className);
  }
  return [...classes].sort();
}

/** Declara um teste por caso: toda classe que o caso renderiza gera CSS com o tema dos tokens. */
export function describeEveryClassGeneratesCss(title: string, cases: Record<string, ComponentType>) {
  let build: (candidates: string[]) => string;

  beforeAll(async () => {
    build = await compileStyles();
  });

  describe(title, () => {
    it.each(Object.entries(cases))('%s: toda classe gera CSS com o tema dos tokens', (_, Case) => {
      render(<Case />);
      const classes = classesInDocument();
      expect(classes.length).toBeGreaterThan(0);
      const css = build(classes);
      const missing = classes.filter((className) => !hasRule(css, className));
      expect(missing).toEqual([]);
    });
  });
}
