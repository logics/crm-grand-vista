// Sobe o processo real da API, do mesmo jeito que produção: `src/index.ts`,
// com apenas as variáveis de ambiente informadas — nada herdado do Vitest.
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';

const apiDir = fileURLToPath(new URL('../..', import.meta.url));
const NODE_ARGS = ['--conditions=@crm/source', '--import', 'tsx', 'src/index.ts'];
const BOOT_TIMEOUT_MS = 20_000;

/** Roda a API até ela terminar. Para os casos em que o boot deve falhar. */
export function runApiUntilExit(env: Record<string, string>) {
  return spawnSync(process.execPath, NODE_ARGS, { cwd: apiDir, env, encoding: 'utf8', timeout: BOOT_TIMEOUT_MS });
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer().listen(0, () => {
      const address = server.address();
      server.close(() => (typeof address === 'object' && address ? resolve(address.port) : reject(new Error('Sem porta livre.'))));
    });
  });
}

export interface RunningApi {
  url: string;
  stop(): Promise<void>;
}

/** Sobe a API numa porta livre e espera ela anunciar que está ouvindo. */
export async function startApi(env: Record<string, string>): Promise<RunningApi> {
  const port = await freePort();
  const child = spawn(process.execPath, NODE_ARGS, { cwd: apiDir, env: { ...env, PORT: String(port) } });
  let output = '';

  const stop = () =>
    new Promise<void>((resolve) => {
      if (child.exitCode !== null) return resolve();
      child.once('exit', () => resolve());
      child.kill();
    });

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`A API não subiu a tempo:\n${output}`)), BOOT_TIMEOUT_MS);
    const collect = (chunk: Buffer) => {
      output += chunk.toString();
      if (output.includes('API ouvindo')) {
        clearTimeout(timer);
        resolve();
      }
    };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`A API terminou com código ${code} antes de subir:\n${output}`));
    });
  });

  return { url: `http://localhost:${port}`, stop };
}
