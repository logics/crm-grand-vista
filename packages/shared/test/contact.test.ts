import { describe, expect, it } from 'vitest';
import {
  CONTACT_ROLE_LABELS,
  CONTACT_ROLES,
  TAX_ID_CNPJ_MESSAGE,
  TAX_ID_CPF_MESSAGE,
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

describe('abbreviateTaxId por CPF ou CNPJ', () => {
  it('devolve o CNPJ numérico inteiro e formatado', () => {
    expect(abbreviateTaxId('11222333000181')).toBe('11.222.333/0001-81');
  });

  it('devolve o CNPJ alfanumérico inteiro e formatado', () => {
    expect(abbreviateTaxId('12ABC34501DE35')).toBe('12.ABC.345/01DE-35');
  });

  it('não confunde com CPF um CNPJ alfanumérico de exatamente 11 dígitos', () => {
    // 14 posições, 11 delas dígitos: contar só dígitos o mascararia como CPF
    expect(abbreviateTaxId('12ABC34501DE35')?.startsWith('***')).toBe(false);
    expect(abbreviateTaxId('1AB2C345678901')).toBe('1A.B2C.345/6789-01');
  });

  it('o que não é CPF nem CNPJ volta como veio', () => {
    expect(abbreviateTaxId('A1234')).toBe('A1234');
  });
});

describe('documento nos schemas de contato', () => {
  const base = { name: 'Fulano', roles: ['buyer'] };

  it('grava o documento normalizado, com ou sem pontuação', () => {
    const formatted = createContactSchema.parse({ ...base, personType: 'pf', taxId: '529.982.247-25' });
    const plain = createContactSchema.parse({ ...base, personType: 'pf', taxId: '52998224725' });
    expect(formatted.taxId).toBe('52998224725');
    expect(plain.taxId).toBe(formatted.taxId);
  });

  it('põe o CNPJ alfanumérico em maiúsculas', () => {
    expect(createContactSchema.parse({ ...base, personType: 'pj', taxId: '12.abc.345/01de-35' }).taxId).toBe(
      '12ABC34501DE35',
    );
  });

  it('o documento é opcional: vazio vira ausência', () => {
    expect(createContactSchema.parse({ ...base, personType: 'pf', taxId: '  ' }).taxId).toBeNull();
    expect(createContactSchema.parse({ ...base, personType: 'pf' }).taxId).toBeUndefined();
  });

  it.each([
    ['CNPJ em PF', 'pf', '11222333000181', TAX_ID_CPF_MESSAGE],
    ['CPF em PJ', 'pj', '52998224725', TAX_ID_CNPJ_MESSAGE],
    ['CPF com dígito errado', 'pf', '52998224726', TAX_ID_CPF_MESSAGE],
    ['sequência repetida', 'pf', '111.111.111-11', TAX_ID_CPF_MESSAGE],
  ])('recusa %s no campo do documento', (_case, personType, taxId, message) => {
    const result = createContactSchema.safeParse({ ...base, personType, taxId });
    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual([expect.objectContaining({ path: ['taxId'], message })]);
  });

  it('a edição confere o documento contra o tipo de pessoa enviado junto', () => {
    expect(updateContactSchema.safeParse({ personType: 'pj', taxId: '52998224725' }).success).toBe(false);
    expect(updateContactSchema.safeParse({ taxId: '52998224725' }).success).toBe(true);
  });
});
