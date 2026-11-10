import { describe, expect, it } from 'vitest';
import {
  CONTACT_ROLE_LABELS,
  CONTACT_ROLES,
  abbreviateTaxId,
  contactOptionSchema,
  createContactSchema,
  updateContactSchema,
} from '../src/contact.js';

describe('contactOptionSchema', () => {
  const contact = {
    id: '0199c1d2-7a4b-7c3e-9f10-1a2b3c4d5e6f',
    name: 'João Batista Ferreira',
    personType: 'pf',
    taxId: '12345678909',
    roles: ['buyer', 'owner'],
  };

  it('aceita o contato com papéis acumulados', () => {
    expect(contactOptionSchema.parse(contact)).toEqual(contact);
  });

  it('aceita contato sem documento', () => {
    expect(contactOptionSchema.parse({ ...contact, taxId: null }).taxId).toBeNull();
  });

  it.each([
    ['tipo de pessoa fora de PF e PJ', { ...contact, personType: 'mei' }],
    ['papel desconhecido', { ...contact, roles: ['investor'] }],
  ])('recusa %s', (_case, option) => {
    expect(contactOptionSchema.safeParse(option).success).toBe(false);
  });
});

describe('papéis', () => {
  it('têm rótulo em pt-BR', () => {
    expect(CONTACT_ROLES.map((role) => CONTACT_ROLE_LABELS[role])).toEqual(['Comprador', 'Proprietário', 'Corretor externo']);
  });
});

describe('abbreviateTaxId', () => {
  it('mascara o CPF, mostrando só os dígitos do meio', () => {
    expect(abbreviateTaxId('12345678909')).toBe('***.456.789-**');
    expect(abbreviateTaxId('123.456.789-09')).toBe('***.456.789-**');
  });

  it('formata o CNPJ por inteiro, que é dado público', () => {
    expect(abbreviateTaxId('12345678000190')).toBe('12.345.678/0001-90');
  });

  it('devolve como veio o que não é CPF nem CNPJ', () => {
    expect(abbreviateTaxId('1234')).toBe('1234');
  });

  it('documento ausente vira null', () => {
    expect(abbreviateTaxId(null)).toBeNull();
    expect(abbreviateTaxId('')).toBeNull();
  });
});

describe('telefone e WhatsApp no schema', () => {
  const base = { personType: 'pf', name: 'João', roles: ['buyer'] } as const;

  it('grava no formato internacional', () => {
    const parsed = createContactSchema.parse({ ...base, phone: '(64) 99999-0000', whatsapp: '+351 912 345 678' });
    expect(parsed.phone).toBe('+5564999990000');
    expect(parsed.whatsapp).toBe('+351912345678');
  });

  it.each(['', '   ', '+55 '])('%j vira ausência', (blank) => {
    expect(createContactSchema.parse({ ...base, phone: blank }).phone).toBeNull();
  });

  it('são opcionais', () => {
    const parsed = createContactSchema.parse(base);
    expect(parsed.phone).toBeUndefined();
    expect(parsed.whatsapp).toBeUndefined();
  });

  it.each([
    ['DDD inexistente', '(10) 99999-0000'],
    ['tamanho errado', '(64) 9999'],
  ])('recusa telefone com %s', (_case, phone) => {
    const result = createContactSchema.safeParse({ ...base, phone });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['phone']);
  });

  it('recusa WhatsApp inválido na edição', () => {
    expect(updateContactSchema.safeParse({ whatsapp: '123' }).success).toBe(false);
  });
});
