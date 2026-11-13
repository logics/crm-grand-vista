import { sql } from 'drizzle-orm';
import { check, index, jsonb, numeric, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { id, timestamps } from './columns.js';
import { commercialStatuses } from './commercial-statuses.js';
import { crops } from './crops.js';
import { levelCheck } from './levels.js';
import { municipalities } from './municipalities.js';
import { tenantId, tenantIsolationPolicy } from './tenant-scope.js';
import { tradingPosts } from './trading-posts.js';
import { users } from './users.js';

/**
 * Fazenda: o imóvel captado. Área sempre em hectares, dinheiro em `numeric`.
 * O corretor responsável é o que o escopo de dados `own` lê. A precificação tem
 * três estados — sem preço (`pricing_mode` nulo), em reais ou em sacas — e o
 * `CHECK` mantém só o conjunto do modo escolhido.
 */
export const farms = pgTable(
  'farms',
  {
    id: id(),
    tenantId: tenantId(),
    name: text('name').notNull(),
    municipalityIbgeCode: text('municipality_ibge_code')
      .notNull()
      .references(() => municipalities.ibgeCode, { onDelete: 'restrict' }),
    responsibleUserId: uuid('responsible_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    tradingPostId: uuid('trading_post_id').references(() => tradingPosts.id, { onDelete: 'restrict' }),
    totalAreaHa: numeric('total_area_ha', { precision: 12, scale: 4 }).notNull(),
    usableAreaHa: numeric('usable_area_ha', { precision: 12, scale: 4 }),
    commercialStatusId: uuid('commercial_status_id')
      .notNull()
      .references(() => commercialStatuses.id, { onDelete: 'restrict' }),
    salesPotential: text('sales_potential'),
    priority: text('priority'),
    waterAvailability: text('water_availability'),
    irrigationPotential: text('irrigation_potential'),
    productivePotential: text('productive_potential'),
    soil: text('soil'),
    topography: text('topography'),
    /** Descrição da água (rios, nascentes, represas); a nota é `water_availability`. */
    water: text('water'),
    historicalProductivity: text('historical_productivity'),
    infrastructure: text('infrastructure'),
    technicalSummary: text('technical_summary'),
    differentials: text('differentials'),
    distanceToHighwayKm: numeric('distance_to_highway_km', { precision: 8, scale: 2 }),
    distanceToWarehouseKm: numeric('distance_to_warehouse_km', { precision: 8, scale: 2 }),
    documentStatus: text('document_status'),
    documentNotes: text('document_notes'),
    latitude: numeric('latitude', { precision: 10, scale: 7 }),
    longitude: numeric('longitude', { precision: 10, scale: 7 }),
    /** Nulo é "sem preço". */
    pricingMode: text('pricing_mode'),
    askingPrice: numeric('asking_price', { precision: 16, scale: 2 }),
    valuationBags: numeric('valuation_bags', { precision: 14, scale: 4 }),
    valuationBagsUnit: text('valuation_bags_unit'),
    /** Congela o tipo do alqueire da avaliação; só existe com a unidade por alqueire. */
    valuationBagsAlqueireType: text('valuation_bags_alqueire_type'),
    valuationCropId: uuid('valuation_crop_id').references(() => crops.id, { onDelete: 'restrict' }),
    /** Sem uso até `fase-1-campos-personalizados`. */
    customFields: jsonb('custom_fields').notNull().default({}),
    ...timestamps,
  },
  (t) => [
    check('farms_total_area_ha_check', sql`${t.totalAreaHa} > 0`),
    check('farms_usable_area_ha_check', sql`${t.usableAreaHa} is null or (${t.usableAreaHa} > 0 and ${t.usableAreaHa} <= ${t.totalAreaHa})`),
    levelCheck(t.salesPotential),
    levelCheck(t.priority),
    levelCheck(t.waterAvailability),
    levelCheck(t.irrigationPotential),
    levelCheck(t.productivePotential),
    check('farms_distance_to_highway_km_check', sql`${t.distanceToHighwayKm} >= 0`),
    check('farms_distance_to_warehouse_km_check', sql`${t.distanceToWarehouseKm} >= 0`),
    check('farms_document_status_check', sql`${t.documentStatus} in ('regular', 'pending', 'irregular')`),
    check(
      'farms_coordinates_check',
      sql`(${t.latitude} is null) = (${t.longitude} is null) and (${t.latitude} is null or (${t.latitude} between -90 and 90 and ${t.longitude} between -180 and 180))`,
    ),
    check('farms_pricing_mode_check', sql`${t.pricingMode} in ('brl', 'bags')`),
    check('farms_asking_price_check', sql`${t.askingPrice} > 0`),
    check('farms_valuation_bags_check', sql`${t.valuationBags} > 0`),
    check('farms_valuation_bags_unit_check', sql`${t.valuationBagsUnit} in ('per_hectare', 'per_alqueire')`),
    check('farms_valuation_bags_alqueire_type_check', sql`${t.valuationBagsAlqueireType} in ('goiano', 'paulista', 'norte')`),
    // Cada cláusula do OR é protegida contra modo nulo: `NULL = 'brl'` daria NULL, e um CHECK aceita NULL.
    check(
      'farms_pricing_check',
      sql`(
        ${t.pricingMode} is null
        and ${t.askingPrice} is null and ${t.valuationBags} is null and ${t.valuationBagsUnit} is null
        and ${t.valuationBagsAlqueireType} is null and ${t.valuationCropId} is null
      ) or (
        ${t.pricingMode} is not null and ${t.pricingMode} = 'brl'
        and ${t.askingPrice} is not null and ${t.valuationBags} is null and ${t.valuationBagsUnit} is null
        and ${t.valuationBagsAlqueireType} is null and ${t.valuationCropId} is null
      ) or (
        ${t.pricingMode} is not null and ${t.pricingMode} = 'bags'
        and ${t.askingPrice} is null and ${t.valuationBags} is not null and ${t.valuationBagsUnit} is not null
        and ${t.valuationCropId} is not null
        and ((${t.valuationBagsUnit} = 'per_alqueire') = (${t.valuationBagsAlqueireType} is not null))
      )`,
    ),
    index('farms_tenant_id_responsible_user_id_idx').on(t.tenantId, t.responsibleUserId),
    index('farms_tenant_id_commercial_status_id_idx').on(t.tenantId, t.commercialStatusId),
    index('farms_tenant_id_municipality_ibge_code_idx').on(t.tenantId, t.municipalityIbgeCode),
    index('farms_tenant_id_created_at_idx').on(t.tenantId, t.createdAt.desc(), t.id),
    tenantIsolationPolicy(),
  ],
);
