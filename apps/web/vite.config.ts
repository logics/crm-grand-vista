import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defaultClientConditions, defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Em desenvolvimento, os pacotes do workspace são lidos do código-fonte
  // (condição `@crm/source`), sem precisar compilá-los antes.
  resolve: { conditions: ['@crm/source', ...defaultClientConditions] },
  // O `.env` é o da raiz, o mesmo da API; do front, só sai o prefixo `VITE_`.
  envDir: '../..',
  server: { port: 5173, strictPort: true },
});
