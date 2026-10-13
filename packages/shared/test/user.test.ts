import { describe, expect, it } from 'vitest';
import { serializeUser } from '../src/user.js';

const record = {
  id: '0198c0de-0000-7000-8000-000000000001',
  name: 'Maria Corretora',
  email: 'maria@grandvista.test',
  image: null,
};

describe('serializador de usuário', () => {
  it('devolve só os campos públicos', () => {
    expect(serializeUser(record)).toEqual(record);
  });

  it('descarta a flag de super admin, em qualquer grafia', () => {
    const serialized = serializeUser({ ...record, isSuperAdmin: true, is_super_admin: true } as typeof record);

    expect(serialized).toEqual(record);
    expect(JSON.stringify(serialized)).not.toMatch(/super/i);
  });

  it('descarta colunas internas que a entidade do banco carrega', () => {
    const serialized = serializeUser({
      ...record,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as typeof record);

    expect(Object.keys(serialized).sort()).toEqual(['email', 'id', 'image', 'name']);
  });

  it('normaliza imagem ausente para nulo', () => {
    const { image: _image, ...withoutImage } = record;

    expect(serializeUser(withoutImage).image).toBeNull();
  });
});
