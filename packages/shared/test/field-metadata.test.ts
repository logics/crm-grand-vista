import { describe, expect, it } from 'vitest';
import { DEFAULT_DISPLAY_CONTEXT, columnToProperty, formatFieldValue } from '../src/field-metadata.js';
import type { ScalarField } from '../src/field-metadata.js';
import { FIELD_REGISTRY, entityFields } from '../src/field-registry.js';

describe('formatFieldValue', () => {
  it.each([
    [({ type: 'text', label: 'Nome' } satisfies ScalarField), 'Fazenda Boa Vista', 'Fazenda Boa Vista'],
    [({ type: 'long_text', label: 'Observações' } satisfies ScalarField), 'linha 1\nlinha 2', 'linha 1\nlinha 2'],
    [({ type: 'number', label: 'Cabeças' } satisfies ScalarField), '1480.5', '1.480,5'],
    [({ type: 'number', label: 'Cabeças' } satisfies ScalarField), '12', '12'],
    [({ type: 'money', label: 'Preço pedido' } satisfies ScalarField), '1480.5', 'R$ 1.480,50'],
    [({ type: 'percent', label: 'Alíquota' } satisfies ScalarField), '12.5', '12,5%'],
    [({ type: 'date', label: 'Vencimento' } satisfies ScalarField), '2026-07-24', '24/07/2026'],
    [({ type: 'boolean', label: 'Bloqueada' } satisfies ScalarField), 'true', 'Sim'],
    [({ type: 'boolean', label: 'Bloqueada' } satisfies ScalarField), 'false', 'Não'],
    [({ type: 'enum', label: 'Potencial', options: { high: 'Alto', low: 'Baixo' } } satisfies ScalarField), 'high', 'Alto'],
  ])('formata %o: %s → %s', (meta, value, expected) => {
    expect(formatFieldValue(meta, value)).toBe(expected);
  });

  it('valor nulo continua nulo, em qualquer tipo', () => {
    expect(formatFieldValue({ type: 'money', label: 'Preço pedido' }, null)).toBeNull();
    expect(formatFieldValue({ type: 'boolean', label: 'Bloqueada' }, null)).toBeNull();
  });

  it('valor de lista fechada fora das opções aparece como gravado, em vez de sumir', () => {
    expect(formatFieldValue({ type: 'enum', label: 'Potencial', options: { high: 'Alto' } }, 'legacy')).toBe('legacy');
  });

  it('data não sofre fuso: é data, não instante', () => {
    expect(formatFieldValue({ type: 'date', label: 'Vencimento' }, '2026-01-01')).toBe('01/01/2026');
  });

  describe('área', () => {
    const area = ({ type: 'area', label: 'Área total' } satisfies ScalarField);

    it('sem contexto, em hectares', () => {
      expect(formatFieldValue(area, '1480.5')).toBe('1.480,5 ha');
      expect(formatFieldValue(area, '1480.5', DEFAULT_DISPLAY_CONTEXT)).toBe('1.480,5 ha');
    });

    it.each([
      ['goiano', '48.4', '10 alq. goiano'],
      ['paulista', '24.2', '10 alq. paulista'],
      ['norte', '1', '0,3676 alq. do norte'],
    ] as const)('com unidade alqueire, no tipo dado (%s)', (alqueireType, hectares, expected) => {
      expect(formatFieldValue(area, hectares, { areaUnit: 'alqueire', alqueireType })).toBe(expected);
    });
  });
});

describe('columnToProperty', () => {
  it.each([
    ['id', 'id'],
    ['tenant_id', 'tenantId'],
    ['total_area_ha', 'totalAreaHa'],
    ['is_default', 'isDefault'],
    ['created_at', 'createdAt'],
  ])('%s → %s', (column, property) => {
    expect(columnToProperty(column)).toBe(property);
  });
});

describe('FIELD_REGISTRY', () => {
  it('registra usuário, empresa, vínculo e perfil de acesso, com rótulo e gênero', () => {
    expect(FIELD_REGISTRY.users).toMatchObject({ label: 'Usuário', gender: 'm' });
    expect(FIELD_REGISTRY.tenants).toMatchObject({ label: 'Empresa', gender: 'f' });
    expect(FIELD_REGISTRY.memberships).toMatchObject({ label: 'Vínculo', gender: 'm' });
    expect(FIELD_REGISTRY.access_profiles).toMatchObject({ label: 'Perfil de acesso', gender: 'm' });
  });

  it('entityFields devolve os campos na ordem do formulário, com o nome camelCase derivado', () => {
    const visible = entityFields('users').filter((item) => item.type !== 'hidden');
    expect(visible.map(({ column, property }) => [column, property])).toEqual([
      ['name', 'name'],
      ['email', 'email'],
      ['email_verified', 'emailVerified'],
      ['image', 'image'],
    ]);
  });

  it('referência só declara a tabela e a coluna de nome', () => {
    expect(FIELD_REGISTRY.memberships.fields.user_id).toEqual({
      type: 'reference',
      label: 'Usuário',
      references: { table: 'users', nameColumn: 'name' },
    });
  });
});
