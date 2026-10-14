import { describe, expect, it } from 'vitest';
import { PERMISSION_CATALOG } from '../src/permissions.js';

const codes = PERMISSION_CATALOG.map((permission) => permission.code);

describe('catálogo de permissões', () => {
  it('não repete código', () => {
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('nomeia cada permissão como <modulo>.<acao>, coerente com module e action', () => {
    for (const permission of PERMISSION_CATALOG) {
      expect(permission.code).toMatch(/^[a-z]+(_[a-z]+)*\.[a-z]+(_[a-z]+)*$/);
      expect(permission.code).toBe(`${permission.module}.${permission.action}`);
    }
  });

  it('preenche escopo e descrição de toda permissão', () => {
    for (const permission of PERMISSION_CATALOG) {
      expect(['tenant', 'platform']).toContain(permission.scope);
      expect(permission.description.trim()).not.toBe('');
    }
  });

  it('cobre os módulos das seis fases', () => {
    const modules = new Set(PERMISSION_CATALOG.map((permission) => permission.module));

    expect([...modules].sort()).toEqual([
      'agenda',
      'auditoria',
      'comissao',
      'configuracoes',
      'contatos',
      'dashboard',
      'due_diligence',
      'empresas',
      'fazendas',
      'matching',
      'oportunidades',
      'perfis_de_acesso',
      'relatorios',
      'usuarios',
      'vendas',
    ]);
  });

  it('traz os códigos que o plano e as specs citam', () => {
    expect(codes).toEqual(
      expect.arrayContaining([
        'fazendas.criar',
        'oportunidades.editar',
        'comissao.ver_de_terceiros',
        'configuracoes.gerenciar',
        'empresas.gerenciar',
        'empresas.ver_todas',
      ]),
    );
  });

  // Permissão de plataforma vive fora dos perfis de acesso: entrar nesta lista é decisão de revisão.
  it('só a gestão de empresas tem escopo de plataforma', () => {
    const platform = PERMISSION_CATALOG.filter((permission) => permission.scope === 'platform');

    expect(platform.map((permission) => permission.code)).toEqual(['empresas.gerenciar', 'empresas.ver_todas']);
  });
});
