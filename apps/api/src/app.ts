import { Hono } from 'hono';

// Router raiz. Cada módulo de negócio (`src/modules/<nome>`) se registra aqui.
export function createApp() {
  return new Hono().get('/health', (c) => c.json({ status: 'ok' }));
}

export type AppType = ReturnType<typeof createApp>;
