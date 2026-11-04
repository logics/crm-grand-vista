import { sql } from 'drizzle-orm';
import { check, pgTable, text, unique } from 'drizzle-orm/pg-core';
import { id, timestamps } from './columns.js';
import { tenantId, tenantIsolationPolicy } from './tenant-scope.js';

/**
 * Parâmetros da empresa, 1:1 (UNIQUE em `tenant_id`). O `id` próprio existe
 * porque o wrapper de auditoria identifica o registro por ele. Só as colunas de
 * exibição de área por ora; as demais entram, com default, nas specs que as consomem.
 */
export const tenantSettings = pgTable(
  'tenant_settings',
  {
    id: id(),
    tenantId: tenantId(),
    /** Só pré-preenchimento e referência de exibição: nunca reinterpreta valor gravado. */
    defaultAlqueireType: text('default_alqueire_type').notNull().default('goiano'),
    areaDisplayUnit: text('area_display_unit').notNull().default('hectare'),
    ...timestamps,
  },
  (table) => [
    unique('tenant_settings_tenant_id_unique').on(table.tenantId),
    check('tenant_settings_default_alqueire_type_check', sql`${table.defaultAlqueireType} in ('goiano', 'paulista', 'norte')`),
    check('tenant_settings_area_display_unit_check', sql`${table.areaDisplayUnit} in ('hectare', 'alqueire')`),
    tenantIsolationPolicy(),
  ],
);
