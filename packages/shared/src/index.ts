// Ponto de entrada do pacote. Schemas Zod, tipos, metadados de campo e
// constantes entram aqui conforme os módulos nascem.
//
// O módulo de ambiente NÃO é reexportado: ele lê o ambiente do processo e é importado
// só por processos Node, via `@crm/shared/env`. O front também importa este
// pacote, e no navegador não há `process`.
export { serializeUser, userSchema } from './user.js';
export type { User } from './user.js';
export { INVALID_CREDENTIALS_MESSAGE, loginSchema, sessionSchema, sessionTenantSchema } from './auth.js';
export type { LoginInput, Session, SessionTenant } from './auth.js';
