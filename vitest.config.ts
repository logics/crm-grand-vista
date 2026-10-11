import { fileURLToPath } from 'node:url';
import { defaultServerConditions, loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

// Os testes importam o código-fonte dos pacotes do workspace, não o `dist`:
// é a condição `@crm/source` declarada no `exports` de cada pacote.
const conditions = ['@crm/source', ...defaultServerConditions];

const ignored = ['**/node_modules/**', '**/dist/**', 'e2e/**', 'design-system-export/**'];

export default defineConfig({
  resolve: { conditions },
  ssr: { resolve: { conditions } },
  // O global setup roda no processo principal, pelo ambiente `__vitest__`, que
  // não herda as condições do `ssr`. Sem isto ele importa o `dist` — que só
  // existe depois de um build, e num checkout limpo (o CI) não existe.
  environments: { __vitest__: { resolve: { conditions } } },
  test: {
    projects: [
      {
        extends: true,
        test: {
          // Sem banco, sem rede, em paralelo. Roda em segundos, sem container.
          name: 'unit',
          include: ['**/*.test.ts', '**/*.test.tsx'],
          exclude: [...ignored, '**/*.integration.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          // Postgres real do container, com as migrations aplicadas do zero
          // a cada execução (ver `packages/db/test/support/global-setup.ts`).
          name: 'integration',
          include: ['**/*.integration.test.ts'],
          exclude: ignored,
          // `.env.test` aponta para o banco de teste; variáveis já definidas
          // no ambiente (CI) têm precedência.
          env: loadEnv('test', rootDir, ''),
          globalSetup: ['packages/db/test/support/global-setup.ts'],
          fileParallelism: false,
        },
      },
    ],
  },
});
