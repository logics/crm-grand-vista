import tailwindcss from '@tailwindcss/vite';
import type { StorybookConfig } from '@storybook/react-vite';
import { defaultClientConditions } from 'vite';

// Vitrine do Design System: cada componente de `src/` com suas variantes e
// estados, em `stories/`. As stories também são os casos dos testes de classe
// (`test/stories.test.tsx`).
const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../stories/*.stories.tsx'],
  // Página de documentação por componente, gerada das stories e dos tipos das props.
  addons: ['@storybook/addon-docs'],
  // A placa e a fachada em raster, para as stories que mostram foto.
  staticDirs: ['../assets'],
  core: { disableTelemetry: true },
  // Resolve os tipos importados (`IconName`, as escalas de tamanho) na tabela de
  // props; o docgen padrão os mostra como `unknown`. Os atributos nativos do
  // elemento ficam de fora, ou a tabela vira a lista do DOM.
  typescript: {
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      shouldRemoveUndefinedFromOptional: true,
      propFilter: (prop) => !prop.parent || !/node_modules/.test(prop.parent.fileName),
    },
  },
  viteFinal: (vite) => ({
    ...vite,
    plugins: [...(vite.plugins ?? []), tailwindcss()],
    // Como na aplicação: os pacotes do workspace são lidos do código-fonte.
    resolve: { ...vite.resolve, conditions: ['@crm/source', ...defaultClientConditions] },
  }),
};

export default config;
