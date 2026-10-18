// Antes do E2E: banco de teste zerado e semeado (`seed.ts`). O seed roda pelo
// Node com `tsx` e a condição `@crm/source`, como a API em desenvolvimento —
// o carregador do Playwright não lê o código-fonte dos pacotes do workspace.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { e2eEnv } from './test-env.js';

const apiDir = fileURLToPath(new URL('../../apps/api', import.meta.url));
const seed = fileURLToPath(new URL('./seed.ts', import.meta.url));

export default function globalSetup() {
  const result = spawnSync(process.execPath, ['--conditions=@crm/source', '--import', 'tsx', seed], {
    cwd: apiDir,
    env: e2eEnv,
    encoding: 'utf8',
  });
  if (result.status !== 0) throw new Error(`O seed do E2E falhou:\n${result.stdout}${result.stderr}`);
}
