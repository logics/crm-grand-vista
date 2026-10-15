// @vitest-environment jsdom
import './support/dom.js';
import { composeStories, setProjectAnnotations } from '@storybook/react-vite';
import { readdirSync } from 'node:fs';
import type { ComponentType } from 'react';
import { describe, expect, it } from 'vitest';
import preview from '../.storybook/preview.js';
import { describeEveryClassGeneratesCss } from './support/classes.js';
import { srcDir } from './support/tailwind.js';

// O Storybook é a vitrine do Design System e, ao mesmo tempo, o catálogo de
// casos dos testes: cada story é renderizada aqui, com as decorações do
// preview, e toda classe que ela produz tem de gerar CSS com o tema dos tokens.
// Variante que não está numa story não é documentada nem verificada.

setProjectAnnotations(preview);

type StoryModule = Parameters<typeof composeStories>[0];

const storyModules = import.meta.glob<StoryModule>('../stories/*.stories.tsx', { eager: true });
const storyFile = (path: string) => path.slice(path.lastIndexOf('/') + 1);

const sourceModules = ['components', 'primitives'].flatMap((dir) =>
  readdirSync(`${srcDir}${dir}`)
    .filter((file) => file.endsWith('.tsx'))
    .map((file) => `${dir}/${file}`),
);

describe('stories', () => {
  it.each(sourceModules)('%s tem um arquivo de stories com o mesmo nome', (module) => {
    const expected = module.slice(module.indexOf('/') + 1).replace(/\.tsx$/, '.stories.tsx');
    expect(Object.keys(storyModules).map(storyFile)).toContain(expected);
  });

  it.each(Object.entries(storyModules).map(([path, module]) => [storyFile(path), module] as const))(
    '%s declara ao menos duas stories (variantes e estados)',
    (_, module) => {
      expect(Object.keys(composeStories(module)).length).toBeGreaterThanOrEqual(2);
    },
  );
});

const cases: Record<string, ComponentType> = {};
for (const [path, module] of Object.entries(storyModules)) {
  for (const [name, Story] of Object.entries(composeStories(module))) cases[`${storyFile(path)} › ${name}`] = Story as ComponentType;
}

describeEveryClassGeneratesCss('classes das stories', cases);
