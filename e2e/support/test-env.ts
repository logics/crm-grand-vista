// Ambiente do E2E: o `.env.test` da raiz (o banco de teste do container), com
// a API e o front em portas próprias, para não colidir com o `pnpm dev`.
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { API_PORT, API_URL, WEB_URL } from './accounts.js';

const rootDir = fileURLToPath(new URL('../..', import.meta.url));

export const e2eEnv: Record<string, string> = {
  ...loadEnv('test', rootDir, ''),
  API_URL,
  VITE_API_URL: API_URL,
  WEB_URL,
  PORT: String(API_PORT),
};
