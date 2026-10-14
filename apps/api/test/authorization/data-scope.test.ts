// A cláusula é pura: escopo e usuário entram, predicado sai. A prova contra o
// banco — 404 por ID direto — é da spec de Fazendas, o primeiro módulo com
// corretor responsável; aqui a tabela é só a forma de ter uma coluna.
import { PgDialect, pgTable, uuid } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { dataScopeClause } from '../../src/authorization/data-scope.js';
import { buildEffectiveAccess } from '../../src/authorization/effective-access.js';

const USER_ID = '0190a5e0-0000-7000-8000-000000000001';
const records = pgTable('records', { id: uuid('id'), responsibleUserId: uuid('responsible_user_id') });
const dialect = new PgDialect();
const render = (clause: Parameters<PgDialect['sqlToQuery']>[0]) => dialect.sqlToQuery(clause);

describe('cláusula de escopo de dados', () => {
  const access = buildEffectiveAccess(USER_ID, [
    { permissions: [], dataScopes: [{ module: 'fazendas', scope: 'own' }, { module: 'contatos', scope: 'all' }] },
  ]);

  it('com own, restringe ao corretor responsável que é o usuário', () => {
    expect(render(dataScopeClause(access, 'fazendas', records.responsibleUserId))).toMatchObject({
      sql: '"records"."responsible_user_id" = $1',
      params: [USER_ID],
    });
  });

  it('com all, não recorta nada', () => {
    expect(render(dataScopeClause(access, 'contatos', records.responsibleUserId))).toMatchObject({ sql: 'true', params: [] });
  });

  it('own num módulo e all em outro produzem predicados diferentes para o mesmo usuário', () => {
    const farms = render(dataScopeClause(access, 'fazendas', records.responsibleUserId));
    const contacts = render(dataScopeClause(access, 'contatos', records.responsibleUserId));

    expect(farms).not.toEqual(contacts);
  });

  it('com vários perfis de acesso, aplica o escopo mais amplo', () => {
    const widened = buildEffectiveAccess(USER_ID, [
      { permissions: [], dataScopes: [{ module: 'fazendas', scope: 'own' }] },
      { permissions: [], dataScopes: [{ module: 'fazendas', scope: 'all' }] },
    ]);

    expect(render(dataScopeClause(widened, 'fazendas', records.responsibleUserId)).sql).toBe('true');
  });

  it('em módulo sem escopo declarado, restringe', () => {
    expect(render(dataScopeClause(access, 'oportunidades', records.responsibleUserId)).params).toEqual([USER_ID]);
  });
});
