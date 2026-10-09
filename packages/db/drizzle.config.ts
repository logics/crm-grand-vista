import { defineConfig } from 'drizzle-kit';

// Só geração de migrations (`drizzle-kit generate`), que não conecta no banco.
// Aplicar é com `pnpm db:migrate`, que lê a string do `crm_owner` pelo módulo de ambiente.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './migrations',
});
