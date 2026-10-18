// Ponto de entrada do pacote. Schemas Zod, tipos, metadados de campo e
// constantes entram aqui conforme os módulos nascem.
//
// O módulo de ambiente NÃO é reexportado: ele lê o ambiente do processo e é importado
// só por processos Node, via `@crm/shared/env`. O front também importa este
// pacote, e no navegador não há `process`.
export {
  accessProfileRefSchema,
  serializeTeamMember,
  serializeUser,
  teamMemberSchema,
  updateUserSchema,
  userSchema,
} from './user.js';
export type { AccessProfileRef, TeamMember, UpdateUserInput, User } from './user.js';
export {
  INVALID_CREDENTIALS_MESSAGE,
  TENANT_BLOCKED_MESSAGE,
  TENANT_NOT_FOUND_MESSAGE,
  loginSchema,
  sessionSchema,
  sessionTenantSchema,
} from './auth.js';
export type { LoginInput, Session, SessionTenant } from './auth.js';
export { DATA_SCOPES, FORBIDDEN_MESSAGE, PERMISSION_CATALOG, PERMISSION_MODULES } from './permissions.js';
export type { DataScope, Permission, PermissionCode, PermissionModule, PermissionScope } from './permissions.js';
export {
  RESERVED_TENANT_SLUGS,
  TENANT_SLUG_MAX_LENGTH,
  TENANT_SLUG_MIN_LENGTH,
  tenantNameSchema,
  tenantSlugSchema,
} from './tenant.js';
export {
  ALQUEIRE_HECTARES,
  ALQUEIRE_LABELS,
  ALQUEIRE_TYPES,
  AREA_SCALE,
  MONEY_SCALE,
  PERCENT_SCALE,
  alqueiresToHectares,
  compareDecimal,
  formatDecimal,
  hectaresToAlqueires,
  parseDecimal,
  roundDecimal,
} from './decimal.js';
export type { AlqueireType, DecimalFormat, ParsedDecimal } from './decimal.js';
