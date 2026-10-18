export { createPool, POOL_MAX_CONNECTIONS } from './pool.js';
export { assertApplicationRole, UnsafeApplicationRoleError } from './role-guard.js';
export { runMigrations } from './migrate.js';
export { createDatabase, MissingTenantError } from './database.js';
export type { Database, SemTenantContext, Transaction } from './database.js';
export { auditedWrites, diffRecords, toAuditText } from './audit.js';
export type { AuditActor, AuditedWrites, FieldChange } from './audit.js';
export { uuidv7 } from './uuid.js';
export * from './schema/index.js';
