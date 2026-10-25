import { describe, expect, it } from 'vitest';
import { assembleHistory, type AuditRow } from '../../src/history/assemble.js';

const USER_ID = '0190a000-0000-7000-8000-000000000001';
const AUTHOR_ID = '0190a000-0000-7000-8000-0000000000aa';
const AT = new Date('2026-07-24T17:30:00.000Z');

let nextId = 1;
const row = (changeId: string, field: string, oldValue: string | null, newValue: string | null, extra: Partial<AuditRow> = {}): AuditRow => ({
  id: nextId++,
  changeId,
  field,
  oldValue,
  newValue,
  userId: AUTHOR_ID,
  createdAt: AT,
  ...extra,
});

const authors = new Map([[AUTHOR_ID, 'Ana Gestora']]);
const assemble = (rows: AuditRow[]) => assembleHistory(rows, { entity: 'users', authors });

describe('assembleHistory', () => {
  it('uma entrada por save, mais nova primeiro', () => {
    const rows = [row('c1', 'name', 'A', 'B'), row('c2', 'name', 'B', 'C'), row('c3', 'name', 'C', 'D')];

    expect(assemble(rows).map((entry) => entry.changeId)).toEqual(['c3', 'c2', 'c1']);
  });

  it('um campo alterado: título do campo, no gênero dele, com rótulo e valores formatados', () => {
    const [name] = assemble([row('c1', 'name', 'Ana', 'Ana Paula')]);
    const [image] = assemble([row('c2', 'image', null, 'foto.png')]);
    const [verified] = assemble([row('c3', 'email_verified', 'false', 'true')]);

    expect(name).toMatchObject({ kind: 'updated', title: 'Nome alterado', changes: [{ field: 'Nome', from: 'Ana', to: 'Ana Paula' }] });
    expect(image).toMatchObject({ title: 'Foto alterada' });
    expect(verified?.changes).toEqual([{ field: 'E-mail verificado', from: 'Não', to: 'Sim' }]);
  });

  it('vários campos no mesmo save: "N alterações", campos na ordem do registro', () => {
    const [entry] = assemble([row('c1', 'email', 'a@x', 'b@x'), row('c1', 'name', 'A', 'B')]);

    expect(entry?.title).toBe('2 alterações');
    expect(entry?.changes.map((change) => change.field)).toEqual(['Nome', 'E-mail']);
  });

  it('cadastro: título no gênero da entidade e os valores iniciais, sem campo oculto', () => {
    const [entry] = assemble([
      row('c1', 'id', null, USER_ID),
      row('c1', 'name', null, 'Ana'),
      row('c1', 'email', null, 'ana@x'),
      row('c1', 'email_verified', null, 'false'),
    ]);

    expect(entry).toMatchObject({
      kind: 'created',
      title: 'Usuário cadastrado',
      changes: [
        { field: 'Nome', from: null, to: 'Ana' },
        { field: 'E-mail', from: null, to: 'ana@x' },
        { field: 'E-mail verificado', from: null, to: 'Não' },
      ],
    });
  });

  it('cadastro no feminino', () => {
    const [entry] = assembleHistory([row('c1', 'id', null, USER_ID), row('c1', 'name', null, 'GV')], {
      entity: 'tenants',
      authors,
    });

    expect(entry?.title).toBe('Empresa cadastrada');
  });

  it('exclusão: título no gênero da entidade e os valores finais como anteriores', () => {
    const [entry] = assemble([row('c1', 'id', USER_ID, null), row('c1', 'name', 'Ana', null)]);

    expect(entry).toMatchObject({
      kind: 'deleted',
      title: 'Usuário excluído',
      changes: [{ field: 'Nome', from: 'Ana', to: null }],
    });
  });

  it('autor pelo nome, "Sistema" quando nulo', () => {
    const [person, cli] = assemble([row('c1', 'name', 'A', 'B', { userId: null }), row('c2', 'name', 'B', 'C')]);

    expect(person?.author).toBe('Ana Gestora');
    expect(cli?.author).toBe('Sistema');
  });

  it('instante em ISO 8601 UTC', () => {
    const [entry] = assemble([row('c1', 'name', 'A', 'B', { createdAt: new Date('2026-07-24T14:30:00-03:00') })]);

    expect(entry?.at).toBe('2026-07-24T17:30:00.000Z');
  });

  it('texto longo vem inteiro, marcado', () => {
    const description = 'linha 1\n'.repeat(50);
    const [entry] = assembleHistory([row('c1', 'description', null, description)], { entity: 'access_profiles', authors });

    expect(entry?.changes).toEqual([{ field: 'Descrição', from: null, to: description, long: true }]);
  });

  it('campo oculto ou fora do registro não aparece, e save só com eles some', () => {
    const entries = assemble([
      row('c1', 'name', 'A', 'B'),
      row('c1', 'last_login_at', null, '2026-07-24T17:30:00.000Z'),
      row('c1', 'coluna_que_saiu', 'x', 'y'),
      row('c2', 'last_login_at', null, '2026-07-25T17:30:00.000Z'),
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ changeId: 'c1', title: 'Nome alterado', changes: [{ field: 'Nome' }] });
  });

  it('coluna gravada duas vezes no mesmo save: anterior da primeira linha, novo da última', () => {
    const [entry] = assemble([row('c1', 'name', 'A', 'B'), row('c1', 'name', 'B', 'C')]);

    expect(entry).toMatchObject({ title: 'Nome alterado', changes: [{ field: 'Nome', from: 'A', to: 'C' }] });
  });

  it('sem filhos nesta entidade, a lista de filhos vem vazia', () => {
    expect(assemble([row('c1', 'name', 'A', 'B')])[0]?.children).toEqual([]);
  });
});
