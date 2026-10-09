import react from '@vitejs/plugin-react';
import { defaultClientConditions, defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // Em desenvolvimento, os pacotes do workspace são lidos do código-fonte
  // (condição `@crm/source`), sem precisar compilá-los antes.
  resolve: { conditions: ['@crm/source', ...defaultClientConditions] },
  server: { port: 5173, strictPort: true },
});
