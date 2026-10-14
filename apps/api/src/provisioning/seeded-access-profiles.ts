// Os três perfis de acesso que toda empresa recebe ao nascer. São dados, não
// papéis em código: a empresa os renomeia, ajusta ou apaga depois — `is_seeded`
// só informa a origem, não protege.
import {
  accessProfiles,
  permissions,
  profileDataScopes,
  profilePermissions,
  type AuditedWrites,
  type Transaction,
} from '@crm/db';
import type { PermissionCode } from '@crm/shared';
import { asc, eq } from 'drizzle-orm';

type DataScope = 'own' | 'all';

interface CatalogPermission {
  code: string;
  module: string;
}

interface SeededAccessProfile {
  name: string;
  description: string;
  /** Escolhe, do catálogo de empresa no banco, o que o perfil de acesso concede. */
  grants: (permission: CatalogPermission) => boolean;
  /**
   * Escopo de dados nos módulos em que o perfil concede alguma permissão.
   * Módulo não listado fica com `all`.
   */
  ownScopeModules?: readonly string[];
}

const BROKER_PERMISSIONS: ReadonlySet<PermissionCode> = new Set([
  'fazendas.ver',
  'fazendas.criar',
  'fazendas.editar',
  'contatos.ver',
  'contatos.criar',
  'contatos.editar',
  'oportunidades.ver',
  'oportunidades.criar',
  'oportunidades.editar',
]);

/** O perfil de acesso que o primeiro administrador da empresa recebe. */
export const ADMIN_ACCESS_PROFILE = 'Admin';

// Admin e Gestor escolhem por regra sobre o catálogo, não por lista: permissão
// nova de fase futura entra neles sem migration de perfil de acesso.
export const SEEDED_ACCESS_PROFILES: readonly SeededAccessProfile[] = [
  {
    name: ADMIN_ACCESS_PROFILE,
    description: 'Acesso total à empresa, inclusive à gestão de perfis de acesso.',
    grants: () => true,
  },
  {
    name: 'Gestor',
    description: 'Acesso total à operação, inclusive à comissão de todos, sem a gestão de perfis de acesso.',
    // Gestão de empresas é de escopo de plataforma: já não está no catálogo de empresa.
    grants: (permission) => permission.module !== 'perfis_de_acesso',
  },
  {
    name: 'Corretor',
    description: 'Cadastra e edita fazendas, contatos e oportunidades; vê só as fazendas e oportunidades pelas quais responde.',
    grants: (permission) => BROKER_PERMISSIONS.has(permission.code as PermissionCode),
    ownScopeModules: ['fazendas', 'oportunidades'],
  },
];

/**
 * Cria os perfis de acesso semeados na empresa da transação e devolve o id de
 * cada um, pelo nome. O catálogo vem do banco — o que a migration sincronizou —,
 * só com as permissões de escopo de empresa.
 *
 * O perfil de acesso passa pelo wrapper de auditoria; permissões e escopos, não:
 * as duas tabelas têm chave composta, sem o `id` que o wrapper exige.
 */
export async function seedAccessProfiles(
  tx: Transaction,
  writes: AuditedWrites,
  tenantId: string,
): Promise<Map<string, string>> {
  const catalog = await tx
    .select({ code: permissions.code, module: permissions.module })
    .from(permissions)
    .where(eq(permissions.scope, 'tenant'))
    .orderBy(asc(permissions.code));

  const created = new Map<string, string>();
  for (const { name, description, grants, ownScopeModules = [] } of SEEDED_ACCESS_PROFILES) {
    const profile = await writes.insert(accessProfiles, { tenantId, name, description, isSeeded: true });
    created.set(name, profile.id);

    const granted = catalog.filter(grants);
    if (granted.length === 0) continue;

    await tx
      .insert(profilePermissions)
      .values(granted.map(({ code }) => ({ tenantId, profileId: profile.id, permissionCode: code })));

    const modules = [...new Set(granted.map((permission) => permission.module))];
    await tx.insert(profileDataScopes).values(
      modules.map((module) => ({
        tenantId,
        profileId: profile.id,
        module,
        scope: (ownScopeModules.includes(module) ? 'own' : 'all') satisfies DataScope,
      })),
    );
  }
  return created;
}
