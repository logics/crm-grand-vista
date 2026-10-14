// Catálogo de permissões e permissão efetiva, no formato que o front consome.
import { permissions, type Transaction } from '@crm/db';
import { PERMISSION_MODULES, type DataScope, type PermissionCode, type PermissionModule } from '@crm/shared';
import { asc, eq } from 'drizzle-orm';
import { dataScopeOf, type EffectiveAccess } from '../../authorization/effective-access.js';

/**
 * As permissões que um perfil de acesso pode compor: as de escopo de empresa,
 * como o banco as tem — é para elas que `profile_permissions` aponta.
 */
export function listTenantPermissions(tx: Transaction) {
  return tx
    .select({
      code: permissions.code,
      module: permissions.module,
      action: permissions.action,
      description: permissions.description,
    })
    .from(permissions)
    .where(eq(permissions.scope, 'tenant'))
    .orderBy(asc(permissions.module), asc(permissions.code));
}

export interface EffectiveAccessView {
  permissions: PermissionCode[];
  /** Todo módulo do catálogo, com o escopo que vale para o usuário. */
  dataScopes: Record<PermissionModule, DataScope>;
}

/**
 * A permissão efetiva serializada. Quem passa por tudo sai como um usuário que
 * tem tudo — a resposta não diz por quê.
 */
export const serializeEffectiveAccess = (access: EffectiveAccess): EffectiveAccessView => ({
  permissions: [...access.permissions].sort(),
  dataScopes: Object.fromEntries(PERMISSION_MODULES.map((module) => [module, dataScopeOf(access, module)])) as Record<
    PermissionModule,
    DataScope
  >,
});
