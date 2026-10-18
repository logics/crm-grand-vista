// Dados semeados para o E2E (`seed.ts`). O banco de teste é zerado a cada
// execução, então valores fixos não colidem.

export const API_PORT = 3100;
export const WEB_PORT = 5174;
export const API_URL = `http://localhost:${API_PORT}`;
export const WEB_URL = `http://localhost:${WEB_PORT}`;

/** Usuária com vínculo em duas empresas, a primeira como padrão. */
export const twoTenantUser = {
  name: 'Ana Ribeiro',
  email: 'ana@e2e.local',
  password: 'senha-do-e2e-com-folga',
  tenants: [
    { slug: 'grand-vista', name: 'Grand Vista', isDefault: true },
    { slug: 'fazendas-norte', name: 'Fazendas Norte', isDefault: false },
  ],
} as const;
