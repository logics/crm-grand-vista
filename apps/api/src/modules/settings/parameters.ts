// Parâmetros da empresa (`tenant_settings`). Sem a linha (empresa ainda sem
// semente), valem os defaults; a primeira escrita a cria.
import { auditedWrites, tenantSettings, type AuditActor, type Transaction } from '@crm/db';
import { DEFAULT_TENANT_SETTINGS, type TenantSettings, type UpdateTenantSettingsInput } from '@crm/shared';
import { eq, sql } from 'drizzle-orm';

/** Os parâmetros da empresa ativa (o RLS recorta a linha). */
export async function readTenantSettings(tx: Transaction): Promise<TenantSettings> {
  const [row] = await tx
    .select({ defaultAlqueireType: tenantSettings.defaultAlqueireType, areaDisplayUnit: tenantSettings.areaDisplayUnit })
    .from(tenantSettings);
  return row ? (row as TenantSettings) : DEFAULT_TENANT_SETTINGS;
}

/** Grava só o que veio; cria a linha se a empresa ainda não a tem. Auditado. */
export async function updateTenantSettings(
  tx: Transaction,
  actor: AuditActor & { tenantId: string },
  input: UpdateTenantSettingsInput,
): Promise<TenantSettings> {
  // Dois primeiros PATCH de uma empresa sem linha não podem disputar o UNIQUE.
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${actor.tenantId}:tenant_settings`}))`);
  const writes = auditedWrites(tx, actor);
  const updated = await writes.update(tenantSettings, input, eq(tenantSettings.tenantId, actor.tenantId));
  if (updated.length === 0) await writes.insert(tenantSettings, { tenantId: actor.tenantId, ...input });
  return readTenantSettings(tx);
}
