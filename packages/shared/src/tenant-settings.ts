// Parâmetros da empresa (`tenant_settings`): o tipo de alqueire padrão e a
// unidade em que a área aparece. São dado de exibição — o que se grava em
// hectares nunca muda com eles.
import { z } from 'zod';
import { ALQUEIRE_TYPES, type AlqueireType } from './decimal.js';
import { DEFAULT_DISPLAY_CONTEXT, type DisplayContext } from './field-metadata.js';

/** Unidades de exibição de área, como em `tenant_settings.area_display_unit`. */
export const AREA_DISPLAY_UNITS = ['hectare', 'alqueire'] as const;
export type AreaDisplayUnit = (typeof AREA_DISPLAY_UNITS)[number];

export const tenantSettingsSchema = z.object({
  defaultAlqueireType: z.enum(ALQUEIRE_TYPES),
  areaDisplayUnit: z.enum(AREA_DISPLAY_UNITS),
});
export type TenantSettings = z.infer<typeof tenantSettingsSchema>;

/** `PATCH /settings`: só os valores do CHECK, e só o que muda. */
export const updateTenantSettingsSchema = tenantSettingsSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, { message: 'Informe ao menos um parâmetro.' });
export type UpdateTenantSettingsInput = z.infer<typeof updateTenantSettingsSchema>;

/** Sem a linha de parâmetros (empresa ainda sem semente), valem os defaults do banco. */
export const DEFAULT_TENANT_SETTINGS: TenantSettings = { defaultAlqueireType: 'goiano', areaDisplayUnit: 'hectare' };

/** Rótulos das opções de unidade, na tela de parâmetros e no histórico. */
export const AREA_DISPLAY_UNIT_LABELS: Record<AreaDisplayUnit, string> = { hectare: 'Hectare', alqueire: 'Alqueire' };

/** Rótulos das opções de tipo de alqueire (`ALQUEIRE_LABELS` é o sufixo de valor, "alq. goiano"). */
export const ALQUEIRE_TYPE_NAMES: Record<AlqueireType, string> = { goiano: 'Goiano', paulista: 'Paulista', norte: 'Norte' };

/** Os parâmetros da empresa como contexto de exibição da formatação de área. */
export function toDisplayContext(settings: TenantSettings | undefined): DisplayContext {
  if (!settings) return DEFAULT_DISPLAY_CONTEXT;
  const alqueireType: AlqueireType = settings.defaultAlqueireType;
  return { areaUnit: settings.areaDisplayUnit === 'alqueire' ? 'alqueire' : 'ha', alqueireType };
}
