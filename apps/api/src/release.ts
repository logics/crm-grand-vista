import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Gravado pelo deploy na raiz do artefato (`tools/deploy/build-api-artifact.sh`),
 * com o commit publicado. Resolve igual a partir de `src/` e de `dist/`.
 */
export const RELEASE_FILE = fileURLToPath(new URL('../release.json', import.meta.url));

/** Versão de quem roda a partir do checkout, sem passar pelo deploy. */
export const LOCAL_VERSION = 'local';

export function readReleaseVersion(file: string = RELEASE_FILE): string {
  let content: string;
  try {
    content = readFileSync(file, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return LOCAL_VERSION;
    throw error;
  }

  const { version } = JSON.parse(content) as { version?: unknown };
  if (typeof version !== 'string' || version === '') {
    throw new Error(`O ${file} não tem a versão do release.`);
  }
  return version;
}
