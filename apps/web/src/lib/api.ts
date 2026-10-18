import type { AppType } from '@crm/api/app';
import { hc } from 'hono/client';
import { env } from '../env.js';

// Cliente RPC do Hono: rotas, corpos e respostas tipados direto do `AppType`
// da API, sem geração de código. A API roda em outra origem e a sessão é um
// cookie `httpOnly`: sem `credentials: 'include'`, o navegador não o envia.
export const api = hc<AppType>(env.VITE_API_URL, { init: { credentials: 'include' } });
