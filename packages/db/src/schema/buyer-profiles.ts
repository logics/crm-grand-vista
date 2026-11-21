import { UFS } from '@crm/shared';
import { sql } from 'drizzle-orm';
import { char, check, index, numeric, pgTable, text, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { id, timestamps } from './columns.js';
import { contacts } from './contacts.js';
import { crops } from './crops.js';
import { levelCheck } from './levels.js';
import { municipalities } from './municipalities.js';
import { paymentMethods } from './payment-methods.js';
import { purchaseProfiles } from './purchase-profiles.js';
import { tenantId, tenantIsolationPolicy } from './tenant-scope.js';

/**
 * Perfil de compra do contato com papel comprador (1:1 opcional). A linha só
 * existe com ao menos uma coluna preenchida. Patrimônio estimado e capacidade
 * de investimento são dados financeiros: existem no banco, mas ainda não saem
 * pela API nem pela tela (chegam com a permissão própria).
 */
export const buyerProfiles = pgTable(
  'buyer_profiles',
  {
    id: id(),
    tenantId: tenantId(),
    contactId: uuid('contact_id')
      .notNull()
      .unique('buyer_profiles_contact_id_unique')
      .references(() => contacts.id, { onDelete: 'cascade' }),
    purchaseProfileId: uuid('purchase_profile_id').references(() => purchaseProfiles.id, { onDelete: 'restrict' }),
    avgTicket: numeric('avg_ticket', { precision: 16, scale: 2 }),
    maxTicket: numeric('max_ticket', { precision: 16, scale: 2 }),
    minAreaHa: numeric('min_area_ha', { precision: 12, scale: 4 }),
    maxAreaHa: numeric('max_area_ha', { precision: 12, scale: 4 }),
    estimatedNetWorth: numeric('estimated_net_worth', { precision: 16, scale: 2 }),
    investmentCapacity: numeric('investment_capacity', { precision: 16, scale: 2 }),
    urgency: text('urgency'),
    qualificationLevel: text('qualification_level'),
    ...timestamps,
  },
  (t) => [
    check('buyer_profiles_avg_ticket_check', sql`${t.avgTicket} > 0`),
    check('buyer_profiles_max_ticket_check', sql`${t.maxTicket} > 0`),
    check('buyer_profiles_min_area_ha_check', sql`${t.minAreaHa} > 0`),
    check('buyer_profiles_max_area_ha_check', sql`${t.maxAreaHa} > 0`),
    check('buyer_profiles_estimated_net_worth_check', sql`${t.estimatedNetWorth} > 0`),
    check('buyer_profiles_investment_capacity_check', sql`${t.investmentCapacity} > 0`),
    // Com um lado nulo a comparação é nula e o CHECK passa.
    check('buyer_profiles_ticket_order_check', sql`${t.avgTicket} <= ${t.maxTicket}`),
    check('buyer_profiles_area_order_check', sql`${t.minAreaHa} <= ${t.maxAreaHa}`),
    levelCheck(t.urgency),
    check('buyer_profiles_qualification_level_check', sql`${t.qualificationLevel} in ('cold', 'warm', 'hot', 'qualified')`),
    index('buyer_profiles_tenant_id_purchase_profile_id_idx').on(t.tenantId, t.purchaseProfileId),
    tenantIsolationPolicy(),
  ],
);

/**
 * Região de interesse: um município **ou** uma UF, nunca os dois nem nenhum.
 * Pende do contato, não do perfil: comprador pode ter só regiões.
 */
export const buyerRegions = pgTable(
  'buyer_regions',
  {
    id: id(),
    tenantId: tenantId(),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    municipalityIbgeCode: text('municipality_ibge_code').references(() => municipalities.ibgeCode, {
      onDelete: 'restrict',
    }),
    uf: char('uf', { length: 2 }),
    ...timestamps,
  },
  (t) => [
    check('buyer_regions_uf_check', sql`${t.uf} in (${sql.raw(UFS.map((uf) => `'${uf}'`).join(', '))})`),
    check('buyer_regions_municipality_or_uf_check', sql`num_nonnulls(${t.municipalityIbgeCode}, ${t.uf}) = 1`),
    uniqueIndex('buyer_regions_contact_id_municipality_unique')
      .on(t.contactId, t.municipalityIbgeCode)
      .where(sql`${t.municipalityIbgeCode} is not null`),
    uniqueIndex('buyer_regions_contact_id_uf_unique')
      .on(t.contactId, t.uf)
      .where(sql`${t.uf} is not null`),
    index('buyer_regions_tenant_id_municipality_ibge_code_idx').on(t.tenantId, t.municipalityIbgeCode),
    index('buyer_regions_tenant_id_uf_idx').on(t.tenantId, t.uf),
    tenantIsolationPolicy(),
  ],
);

/** Cultura de interesse do comprador (as mesmas `crops` da fazenda). */
export const buyerCrops = pgTable(
  'buyer_crops',
  {
    id: id(),
    tenantId: tenantId(),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    cropId: uuid('crop_id')
      .notNull()
      .references(() => crops.id, { onDelete: 'restrict' }),
    ...timestamps,
  },
  (t) => [
    unique('buyer_crops_contact_id_crop_id_unique').on(t.contactId, t.cropId),
    index('buyer_crops_tenant_id_crop_id_idx').on(t.tenantId, t.cropId),
    tenantIsolationPolicy(),
  ],
);

/** Forma de pagamento aceita pelo comprador. */
export const buyerPaymentMethods = pgTable(
  'buyer_payment_methods',
  {
    id: id(),
    tenantId: tenantId(),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    paymentMethodId: uuid('payment_method_id')
      .notNull()
      .references(() => paymentMethods.id, { onDelete: 'restrict' }),
    ...timestamps,
  },
  (t) => [
    unique('buyer_payment_methods_contact_id_payment_method_id_unique').on(t.contactId, t.paymentMethodId),
    index('buyer_payment_methods_tenant_id_payment_method_id_idx').on(t.tenantId, t.paymentMethodId),
    tenantIsolationPolicy(),
  ],
);
