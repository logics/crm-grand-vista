// Permissão efetiva e escopo de dados por módulo: a regra pura, sem banco. Quem
// carrega os perfis de acesso do usuário é `service.ts`; aqui só se compõe.
import {
  PERMISSION_CATALOG,
  PERMISSION_MODULES,
  type DataScope,
  type PermissionCode,
  type PermissionModule,
} from '@crm/shared';

/** O que o usuário pode fazer na empresa ativa, resolvido uma vez por requisição. */
export interface EffectiveAccess {
  userId: string;
  permissions: ReadonlySet<PermissionCode>;
  /** Escopo de dados por módulo. Módulo ausente vale `own` (`dataScopeOf`). */
  dataScopes: ReadonlyMap<PermissionModule, DataScope>;
}

/** O que um perfil de acesso vinculado ao usuário concede. */
export interface ProfileGrants {
  permissions: readonly PermissionCode[];
  dataScopes: readonly { module: PermissionModule; scope: DataScope }[];
}

/** O mais amplo de vários escopos: `all` em qualquer um vence `own`. Sem escopo nenhum, `own`. */
export const widestScope = (scopes: Iterable<DataScope>): DataScope =>
  [...scopes].includes('all') ? 'all' : 'own';

/**
 * A união do que os perfis de acesso concedem. Não há subtração: perfil nenhum
 * remove o que outro concede, nem estreita o escopo que outro alarga.
 */
export function buildEffectiveAccess(userId: string, profiles: readonly ProfileGrants[]): EffectiveAccess {
  const scopesByModule = new Map<PermissionModule, DataScope[]>();
  for (const { module, scope } of profiles.flatMap((profile) => profile.dataScopes)) {
    scopesByModule.set(module, [...(scopesByModule.get(module) ?? []), scope]);
  }

  return {
    userId,
    permissions: new Set(profiles.flatMap((profile) => profile.permissions)),
    dataScopes: new Map([...scopesByModule].map(([module, scopes]) => [module, widestScope(scopes)])),
  };
}

/** Todo o catálogo, com escopo `all` em todos os módulos — a travessia de quem passa por tudo. */
export const unrestrictedAccess = (userId: string): EffectiveAccess => ({
  userId,
  permissions: new Set(PERMISSION_CATALOG.map((permission) => permission.code)),
  dataScopes: new Map(PERMISSION_MODULES.map((module) => [module, 'all'])),
});

/**
 * Escopo do usuário no módulo. Sem perfil que o declare, `own`: negar por padrão
 * vale também para o escopo.
 */
export const dataScopeOf = (access: EffectiveAccess, module: PermissionModule): DataScope =>
  access.dataScopes.get(module) ?? 'own';
