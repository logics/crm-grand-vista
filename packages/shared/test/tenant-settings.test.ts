import { describe, expect, it } from 'vitest';
import { DEFAULT_DISPLAY_CONTEXT, formatFieldValue } from '../src/field-metadata.js';
import {
  DEFAULT_TENANT_SETTINGS,
  toDisplayContext,
  updateTenantSettingsSchema,
} from '../src/tenant-settings.js';

describe('toDisplayContext', () => {
  it('sem parâmetros, o contexto é o padrão (hectare)', () => {
    expect(toDisplayContext(undefined)).toEqual(DEFAULT_DISPLAY_CONTEXT);
    expect(toDisplayContext(DEFAULT_TENANT_SETTINGS)).toEqual(DEFAULT_DISPLAY_CONTEXT);
  });

  it('alqueire do tipo padrão vira unidade alqueire daquele tipo', () => {
    const context = toDisplayContext({ defaultAlqueireType: 'paulista', areaDisplayUnit: 'alqueire' });
    expect(context).toEqual({ areaUnit: 'alqueire', alqueireType: 'paulista' });
    expect(formatFieldValue({ type: 'area', label: 'Área' }, '24.2', context)).toBe('10 alq. paulista');
  });
});

describe('updateTenantSettingsSchema', () => {
  it.each([
    [{ areaDisplayUnit: 'alqueire' }],
    [{ defaultAlqueireType: 'norte' }],
    [{ defaultAlqueireType: 'paulista', areaDisplayUnit: 'hectare' }],
  ])('aceita %o', (input) => {
    expect(updateTenantSettingsSchema.safeParse(input).success).toBe(true);
  });

  it.each([[{}], [{ areaDisplayUnit: 'acre' }], [{ defaultAlqueireType: 'mineiro' }], [{ currency: 'USD' }]])(
    'recusa %o',
    (input) => {
      expect(updateTenantSettingsSchema.safeParse(input).success).toBe(false);
    },
  );
});
