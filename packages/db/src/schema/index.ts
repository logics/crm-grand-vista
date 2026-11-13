// Schema Drizzle — fonte única da verdade das tabelas. Colunas conforme
// `docs/specs/modelo-de-dados.md`.
export { tenants } from './tenants.js';
export { users } from './users.js';
export { accounts, sessions, verifications } from './auth.js';
export { memberships } from './memberships.js';
export { permissions, userPlatformPermissions } from './permissions.js';
export { accessProfiles, profileDataScopes, profilePermissions, userProfiles } from './access-profiles.js';
export { auditLog } from './audit-log.js';
export { municipalities } from './municipalities.js';
export { crops } from './crops.js';
export { aptitudes } from './aptitudes.js';
export { contactClassifications } from './contact-classifications.js';
export { documentCategories } from './document-categories.js';
export { leadSources } from './lead-sources.js';
export { paymentMethods } from './payment-methods.js';
export { purchaseProfiles } from './purchase-profiles.js';
export { commercialStatuses } from './commercial-statuses.js';
export { tradingPosts, tradingPostMunicipalities } from './trading-posts.js';
export { tenantSettings } from './tenant-settings.js';
export { contacts, contactRoles } from './contacts.js';
export { farmAptitudes, farmCrops, farmOwners, farms } from './farms.js';

