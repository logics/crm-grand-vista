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
export type { AccessProfileRef, TeamMember, UpdateUserInput, User, UserOption } from './user.js';
export {
  INVALID_CREDENTIALS_MESSAGE,
  TENANT_BLOCKED_MESSAGE,
  TENANT_NOT_FOUND_MESSAGE,
  TOO_MANY_LOGIN_ATTEMPTS_MESSAGE,
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
  AREA_FORMAT,
  AREA_SCALE,
  MONEY_FORMAT,
  MONEY_SCALE,
  PERCENT_FORMAT,
  PERCENT_SCALE,
  alqueiresToHectares,
  compareDecimal,
  formatDecimal,
  formatMoney,
  formatPercent,
  hectaresToAlqueires,
  parseDecimal,
  parseShiftedDecimal,
  roundDecimal,
} from './decimal.js';
export type { AlqueireType, DecimalFormat, ParsedDecimal } from './decimal.js';
export {
  REFERRER_KINDS,
  REFERRER_KIND_LABELS,
  appendReferralLink,
  assembleReferralChain,
  describeReferralChainIssue,
  isEligibleReferrer,
  referrerKey,
  removeReferralLink,
  reorderReferralChain,
  validateReferralChain,
} from './referral-chain.js';
export type { ReferralChainIssue, ReferralLink, ReferralSubject, Referrer, ReferrerKind } from './referral-chain.js';
export {
  UFS,
  UF_NAMES,
  isMunicipality,
  municipalityLabel,
  municipalityReference,
  municipalityOptionSchema,
  regionKey,
  regionLabel,
  regionOptionSchema,
  ufOptionSchema,
  ufSchema,
} from './region.js';
export type { MunicipalityOption, RegionOption, Uf, UfOption } from './region.js';
export {
  CONTACT_ROLES,
  CONTACT_ROLE_LABELS,
  PERSON_TYPES,
  PERSON_TYPE_LABELS,
  CONTACT_NOT_FOUND_MESSAGE,
  CONTACT_ROLES_LABEL,
  contactNameLabel,
  hasLegalName,
  CONTACT_ROLE_REQUIRED_MESSAGE,
  CONTACT_SORT_FIELDS,
  abbreviateTaxId,
  TAX_ID_CNPJ_MESSAGE,
  TAX_ID_CPF_MESSAGE,
  TAX_ID_TAKEN_MESSAGE,
  taxIdIssue,
  contactListQuerySchema,
  contactOptionSchema,
  contactPageSchema,
  contactSchema,
  createContactSchema,
  updateContactSchema,
} from './contact.js';
export type {
  Contact,
  ContactListQuery,
  CreateContactInput,
  UpdateContactInput,
  ContactOption,
  ContactRole,
  PersonType,
} from './contact.js';
export { DEFAULT_COUNTRY_PREFIX, INVALID_PHONE_MESSAGE, formatPhone, isBlankPhone, mailtoUrl, normalizePhone, telUrl, whatsappUrl } from './phone.js';
export { farmOptionSchema, formatAlqueires, formatHectares } from './farm.js';
export type { FarmOption } from './farm.js';
export { describeCommissionIssue, splitCommission, validateCommission } from './commission.js';
export type {
  CommissionGroup,
  CommissionGroupSplit,
  CommissionIssue,
  CommissionMember,
  CommissionMemberSplit,
  CommissionParty,
  CommissionSplit,
} from './commission.js';
export {
  ALQUEIRE_TYPE_NAMES,
  AREA_DISPLAY_UNITS,
  AREA_DISPLAY_UNIT_LABELS,
  DEFAULT_TENANT_SETTINGS,
  tenantSettingsSchema,
  toDisplayContext,
  updateTenantSettingsSchema,
} from './tenant-settings.js';
export type { AreaDisplayUnit, TenantSettings, UpdateTenantSettingsInput } from './tenant-settings.js';
export { TENANT_SEED } from './tenant-seed.js';
export type { SeedCommercialStatus, TenantSeed } from './tenant-seed.js';
export { DEFAULT_PAGE_SIZE, PAGE_SIZES, listPageSchema, listQuerySchema, parseSort } from './listing.js';
export type { ListPage, ListQuery, PageSize, SortDirection, SortParam } from './listing.js';
export {
  DEFAULT_DISPLAY_CONTEXT,
  HIDDEN,
  RECORD_COLUMNS,
  columnToProperty,
  formatFieldValue,
} from './field-metadata.js';
export type {
  AreaUnit,
  DisplayContext,
  EntityMeta,
  ExpandedChange,
  ExpandedJsonbField,
  FieldMeta,
  FieldType,
  GrammaticalGender,
  HiddenField,
  ReferenceField,
  ReferenceLabel,
  ScalarField,
} from './field-metadata.js';
export { FIELD_REGISTRY, entityFields, metaFields } from './field-registry.js';
export type { EntityField, RegisteredTable } from './field-registry.js';
export {
  HISTORY_KINDS,
  HISTORY_PAGE_SIZE,
  SYSTEM_AUTHOR,
  historyChangeSchema,
  historyChildSchema,
  historyEntrySchema,
  historyPageSchema,
} from './history.js';
export type { HistoryChange, HistoryChild, HistoryEntry, HistoryKind, HistoryPage } from './history.js';
export {
  COMMERCIAL_STATUS_MEANINGS,
  VOCABULARIES,
  VOCABULARY_IN_USE_MESSAGE,
  VOCABULARY_KEYS,
  VOCABULARY_NAME_MAX_LENGTH,
  VOCABULARY_NAME_TAKEN_INACTIVE_MESSAGE,
  VOCABULARY_NOT_MANUAL_MESSAGE,
  VOCABULARY_REORDER_MISMATCH_MESSAGE,
  reorderVocabularySchema,
  VOCABULARY_NAME_TAKEN_MESSAGE,
  VOCABULARY_STATUSES,
  createVocabularyEntrySchema,
  findVocabulary,
  lastActiveMeaningMessage,
  serializeVocabularyEntry,
  updateVocabularyEntrySchema,
  municipalityTakenMessage,
  servedMunicipalitiesSchema,
  servedMunicipalitySchema,
  tradingPostSuggestionQuerySchema,
  tradingPostSuggestionSchema,
  VOCABULARY_MUNICIPALITIES_MAX,
  VOCABULARY_MUNICIPALITIES_UNEXPECTED_MESSAGE,
  VOCABULARY_MUNICIPALITY_TAKEN_MESSAGE,
  VOCABULARY_MUNICIPALITY_UNKNOWN_MESSAGE,
  vocabulariesByLabel,
  vocabularyDefaultsSchema,
  vocabularyEntryPageSchema,
  vocabularyMaxEntriesMessage,
  vocabularyMeaningRequiredMessage,
  vocabularyMeaningUnexpectedMessage,
  vocabularyEntrySchema,
  vocabularyListQuerySchema,
  vocabularyMenuItemSchema,
  vocabularyNameSchema,
  vocabularyOptionsPageSchema,
  vocabularyOptionsQuerySchema,
  VOCABULARY_OPTIONS_MAX_PAGE_SIZE,
  VOCABULARY_OPTIONS_PAGE_SIZE,
} from './vocabulary.js';
export type {
  AnyVocabulary,
  CreateVocabularyEntryInput,
  ReorderVocabularyInput,
  ServedMunicipality,
  TradingPostSuggestion,
  UpdateVocabularyEntryInput,
  VocabularyDefaults,
  VocabularyDefinition,
  VocabularyEntry,
  VocabularyKey,
  VocabularyListQuery,
  VocabularyMenuItem,
  VocabularyOption,
  VocabularyOptionsPage,
  VocabularyOptionsQuery,
  VocabularyOrderMode,
  VocabularyStatus,
} from './vocabulary.js';
export { formatTaxId, isValidCnpj, isValidCpf, maskTaxId, normalizeTaxId, sanitizeTaxIdInput, taxIdKind } from './tax-id.js';
