import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { formErrorMap, isRequiredField, requiredMessage } from '../../src/lib/form-schema.js';

const schema = z.object({
  name: z.string().min(1),
  notes: z.string().optional(),
  nickname: z.string().nullish(),
  area: z.coerce.number().positive(),
  owner: z.object({ email: z.email(), phone: z.string().optional() }),
  site: z.url().optional(),
});

describe('isRequiredField', () => {
  it('é obrigatório o campo que não aceita ausência', () => {
    expect(isRequiredField(schema, 'name')).toBe(true);
    expect(isRequiredField(schema, 'area')).toBe(true);
    expect(isRequiredField(schema, 'notes')).toBe(false);
    expect(isRequiredField(schema, 'nickname')).toBe(false);
  });

  it('desce nos objetos aninhados pelo caminho com ponto', () => {
    expect(isRequiredField(schema, 'owner.email')).toBe(true);
    expect(isRequiredField(schema, 'owner.phone')).toBe(false);
  });

  it('campo fora do schema, ou schema sem forma de objeto, não é obrigatório', () => {
    expect(isRequiredField(schema, 'missing')).toBe(false);
    expect(isRequiredField(schema, 'name.length')).toBe(false);
    expect(isRequiredField(z.string(), 'name')).toBe(false);
  });

  it('atravessa o refine do objeto', () => {
    const refined = schema.refine((value) => value.name !== value.notes);
    expect(isRequiredField(refined, 'name')).toBe(true);
  });
});

describe('formErrorMap', () => {
  const parse = (values: Record<string, unknown>) =>
    schema.safeParse(values, { error: formErrorMap(schema, values) }).error?.issues.map(({ path, message }) => [path.join('.'), message]);

  it('campo vazio, nulo ou ausente é obrigatório, qualquer que seja a regra que falhou', () => {
    expect(parse({ name: '', area: '', owner: { email: null } })).toEqual([
      ['name', requiredMessage],
      ['area', requiredMessage],
      ['owner.email', requiredMessage],
    ]);
  });

  it('campo preenchido e inválido recebe a mensagem do zod em pt-BR', () => {
    const messages = parse({ name: 'Três Barras', area: '-3', owner: { email: 'contato@' } })?.map(([, message]) => message);
    expect(messages?.[0]).toBe('Pequeno demais: esperava que o número fosse > 0');
    expect(messages?.[1]).toMatch(/inválido/);
  });

  it('campo opcional vazio que falha não é dito obrigatório: sai a mensagem do zod', () => {
    const issues = parse({ name: 'Três Barras', area: '10', owner: { email: 'a@b.com' }, site: '' });
    expect(issues).toHaveLength(1);
    expect(issues?.[0]?.[0]).toBe('site');
    expect(issues?.[0]?.[1]).not.toBe(requiredMessage);
  });

  it('a mensagem declarada no schema vence', () => {
    const custom = z.object({ name: z.string().min(1, 'Dê um nome à fazenda') });
    const values = { name: '' };
    expect(custom.safeParse(values, { error: formErrorMap(custom, values) }).error?.issues[0]?.message).toBe('Dê um nome à fazenda');
  });
});
