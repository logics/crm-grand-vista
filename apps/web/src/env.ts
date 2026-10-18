import { parseEnv, webEnvSchema } from '@crm/shared/env';

// Ambiente do build, validado ao carregar a aplicação: variável faltando é
// erro com o nome dela, não `undefined` dentro de uma URL.
export const env = parseEnv(webEnvSchema, { VITE_API_URL: import.meta.env.VITE_API_URL });
