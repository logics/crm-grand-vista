// Resolução da permissão efetiva a partir do banco. Roda uma vez por
// requisição, no contexto de empresa, e não é guardada na sessão: revogar um
// perfil de acesso vale na requisição seguinte, não no próximo login.
import { profileDataScopes, profilePermissions, userProfiles, type Transaction } from '@crm/db';
import type { DataScope, PermissionCode, PermissionModule } from '@crm/shared';
import { eq } from 'drizzle-orm';
import {
  buildEffectiveAccess,
  unrestrictedAccess,
  type EffectiveAccess,
  type ProfileGrants,
} from './effective-access.js';

interface EffectiveAccessInput {
  userId: string;
  /** Só esta função decide com ela. Rota nenhuma lê a flag. */
  isSuperAdmin: boolean;
  /** Transação já presa à empresa ativa: o RLS deixa ver só os perfis de acesso dela. */
  withTenant: <T>(fn: (tx: Transaction) => Promise<T>) => Promise<T>;
}

/**
 * Permissão efetiva do usuário na empresa ativa. O curto-circuito do super admin
 * mora aqui, e só aqui: ele recebe tudo, sem perfil nenhum vinculado, e nenhuma
 * rota precisa saber que ele existe.
 */
export async function resolveEffectiveAccess({
  userId,
  isSuperAdmin,
  withTenant,
}: EffectiveAccessInput): Promise<EffectiveAccess> {
  if (isSuperAdmin) return unrestrictedAccess(userId);

  const { grants, scopes } = await withTenant(async (tx) => ({
    grants: await tx
      .select({ profileId: profilePermissions.profileId, code: profilePermissions.permissionCode })
      .from(userProfiles)
      .innerJoin(profilePermissions, eq(profilePermissions.profileId, userProfiles.profileId))
      .where(eq(userProfiles.userId, userId)),
    scopes: await tx
      .select({ profileId: profileDataScopes.profileId, module: profileDataScopes.module, scope: profileDataScopes.scope })
      .from(userProfiles)
      .innerJoin(profileDataScopes, eq(profileDataScopes.profileId, userProfiles.profileId))
      .where(eq(userProfiles.userId, userId)),
  }));

  // O banco guarda texto; a FK para o catálogo e o CHECK garantem códigos e escopos válidos.
  const profiles = new Map<string, { permissions: PermissionCode[]; dataScopes: ProfileGrants['dataScopes'][number][] }>();
  const profileOf = (profileId: string) => {
    const profile = profiles.get(profileId) ?? { permissions: [], dataScopes: [] };
    profiles.set(profileId, profile);
    return profile;
  };
  for (const { profileId, code } of grants) profileOf(profileId).permissions.push(code as PermissionCode);
  for (const { profileId, module, scope } of scopes) {
    profileOf(profileId).dataScopes.push({ module: module as PermissionModule, scope: scope as DataScope });
  }

  return buildEffectiveAccess(userId, [...profiles.values()]);
}
