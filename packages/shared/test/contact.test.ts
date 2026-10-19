import { describe, expect, it } from 'vitest';
import { CONTACT_ROLE_LABELS, CONTACT_ROLES, abbreviateTaxId, contactOptionSchema } from '../src/contact.js';

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
    expect(abbreviateTaxId('12345678909', 'pf')).toBe('***.456.789-**');
    expect(abbreviateTaxId('123.456.789-09', 'pf')).toBe('***.456.789-**');
  });

  it('formata o CNPJ por inteiro, que é dado público', () => {
    expect(abbreviateTaxId('12345678000190', 'pj')).toBe('12.345.678/0001-90');
  });

  it('devolve como veio o que não tem os dígitos do tipo', () => {
    expect(abbreviateTaxId('1234', 'pf')).toBe('1234');
    expect(abbreviateTaxId('12345678909', 'pj')).toBe('12345678909');
  });

  it('documento ausente vira null', () => {
    expect(abbreviateTaxId(null, 'pf')).toBeNull();
    expect(abbreviateTaxId('', 'pj')).toBeNull();
  });
});
