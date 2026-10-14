import { type Permission, PERMISSION_CATALOG } from '@crm/shared';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { permissions } from './schema/index.js';

export type CatalogSyncReport = {
  inserted: string[];
  /** Permissões cuja descrição mudou no código. */
  updated: string[];
  /** No banco, mas não mais no código: ficam, até uma migration escrita à mão removê-las. */
  orphaned: string[];
};

/**
 * Espelha o catálogo do código na tabela `permissions`. Roda como `crm_owner`,
 * pelo `runMigrations`, depois das migrations — a aplicação só lê o catálogo.
 *
 * Aditiva e idempotente: insere o que é novo, atualiza a descrição alterada e
 * não toca no que já está igual. Nunca apaga: permissão removida do código fica,
 * porque apagar remove por cascata os vínculos com perfis de acesso. Também
 * recusa mudar o escopo de uma permissão existente — tornar de plataforma uma
 * permissão que perfis de acesso já concedem é decisão para migration escrita à
 * mão, não efeito colateral de sincronização.
 */
export async function syncPermissionCatalog(
  db: NodePgDatabase,
  catalog: readonly Permission[] = PERMISSION_CATALOG,
): Promise<CatalogSyncReport> {
  return db.transaction(async (tx) => {
    const existing = new Map((await tx.select().from(permissions)).map((row) => [row.code, row]));

    const scopeChanges = catalog.filter((permission) => {
      const current = existing.get(permission.code);
      return current !== undefined && current.scope !== permission.scope;
    });
    if (scopeChanges.length > 0) {
      const codes = scopeChanges.map((permission) => permission.code).join(', ');
      throw new Error(
        `Mudança de escopo de permissão exige migration escrita à mão; a sincronização não a aplica: ${codes}.`,
      );
    }

    const added = catalog.filter((permission) => !existing.has(permission.code));
    const changed = catalog.filter((permission) => {
      const current = existing.get(permission.code);
      return current !== undefined && current.description !== permission.description;
    });

    if (added.length > 0) await tx.insert(permissions).values([...added]);
    for (const { code, description } of changed) {
      await tx.update(permissions).set({ description }).where(eq(permissions.code, code));
    }

    const catalogCodes = new Set<string>(catalog.map((permission) => permission.code));
    return {
      inserted: added.map((permission) => permission.code),
      updated: changed.map((permission) => permission.code),
      orphaned: [...existing.keys()].filter((code) => !catalogCodes.has(code)),
    };
  });
}
