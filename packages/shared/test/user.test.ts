import { describe, expect, it } from 'vitest';
import { serializeTeamMember, serializeUser, updateUserSchema } from '../src/user.js';

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

describe('serializador de membro da equipe', () => {
  const profile = { id: '0198c0de-0000-7000-8000-0000000000a1', name: 'Gestor' };

  it('devolve o usuário serializado com os perfis de acesso vinculados', () => {
    expect(serializeTeamMember(record, [profile])).toEqual({ ...record, accessProfiles: [profile] });
  });

  it('descarta a flag de super admin e as colunas internas do perfil de acesso', () => {
    const serialized = serializeTeamMember({ ...record, isSuperAdmin: true } as typeof record, [
      { ...profile, tenantId: '0198c0de-0000-7000-8000-0000000000b1', isSeeded: true } as typeof profile,
    ]);

    expect(serialized).toEqual({ ...record, accessProfiles: [profile] });
  });

  it('super admin sem perfil vinculado sai igual a qualquer usuário sem perfil', () => {
    const superAdmin = serializeTeamMember({ ...record, isSuperAdmin: true } as typeof record, []);

    expect(superAdmin).toEqual(serializeTeamMember(record, []));
  });
});

describe('schema de atualização de usuário', () => {
  it('aceita os campos editáveis', () => {
    expect(updateUserSchema.parse({ name: '  Maria Gestora ', image: null })).toEqual({
      name: 'Maria Gestora',
      image: null,
    });
  });

  it('descarta a flag de super admin, em qualquer grafia, sem acusar erro', () => {
    const result = updateUserSchema.safeParse({ name: 'Maria', isSuperAdmin: true, is_super_admin: true });

    expect(result).toEqual({ success: true, data: { name: 'Maria' } });
  });

  it('corpo só com a flag vira atualização vazia, não erro revelador', () => {
    expect(updateUserSchema.safeParse({ is_super_admin: true })).toEqual({ success: true, data: {} });
  });

  it('descarta e-mail e demais colunas que não são editáveis por aqui', () => {
    expect(updateUserSchema.parse({ name: 'Maria', email: 'outra@teste.local', id: record.id })).toEqual({
      name: 'Maria',
    });
  });

  it('recusa nome em branco', () => {
    expect(updateUserSchema.safeParse({ name: '   ' }).success).toBe(false);
  });
});
