// A semente de cadastros auxiliares e parâmetros de uma empresa nova. A lista
// vive em `TENANT_SEED` (`@crm/shared`), a mesma que a migration aplicou às
// empresas existentes. Passa pelo wrapper de auditoria, com o autor do
// provisionamento (nulo: "Sistema").
import { commercialStatuses, crops, documentCategories, tenantSettings, type AuditedWrites } from '@crm/db';
import { TENANT_SEED } from '@crm/shared';

export async function seedTenantDefaults(writes: AuditedWrites, tenantId: string): Promise<void> {
  // Colunas com default do banco: a linha de parâmetros nasce só com a empresa.
  await writes.insert(tenantSettings, { tenantId });

  for (const [displayOrder, { name, systemMeaning }] of TENANT_SEED.commercialStatuses.entries()) {
    await writes.insert(commercialStatuses, { tenantId, name, systemMeaning, displayOrder });
  }
  for (const name of TENANT_SEED.documentCategories) await writes.insert(documentCategories, { tenantId, name });
  for (const name of TENANT_SEED.crops) await writes.insert(crops, { tenantId, name });
}
