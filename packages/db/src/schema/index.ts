// Schema Drizzle — fonte única da verdade das tabelas. Colunas conforme
// `docs/specs/modelo-de-dados.md`.
export { tenants } from './tenants.js';
export { users } from './users.js';
export { accounts, sessions, verifications } from './auth.js';
export { memberships } from './memberships.js';
export { permissions, userPlatformPermissions } from './permissions.js';
export { accessProfiles, profileDataScopes, profilePermissions, userProfiles } from './access-profiles.js';
export { auditLog } from './audit-log.js';
