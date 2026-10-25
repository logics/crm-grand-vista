import { HIDDEN, RECORD_COLUMNS, type EntityMeta, type ExpandedChange } from '@crm/shared';
import { describe, expect, it } from 'vitest';
import type { EffectiveAccess } from '../../src/authorization/effective-access.js';
import {
  DELETED_REFERENCE,
  assembleHistory,
  referenceKey,
  referencesToResolve,
  type AssembleOptions,
  type AuditRow,
  type HistoryChildDeclaration,
} from '../../src/history/assemble.js';

const USER_ID = '0190a000-0000-7000-8000-000000000001';
const AUTHOR_ID = '0190a000-0000-7000-8000-0000000000aa';
const AT = new Date('2026-07-24T17:30:00.000Z');

let nextId = 1;
const row = (changeId: string, field: string, oldValue: string | null, newValue: string | null, extra: Partial<AuditRow> = {}): AuditRow => ({
  id: nextId++,
  entity: 'users',
  entityId: USER_ID,
  changeId,
  field,
  oldValue,
  newValue,
  userId: AUTHOR_ID,
  createdAt: AT,
  ...extra,
});

const authors = new Map([[AUTHOR_ID, 'Ana Gestora']]);
const reader: EffectiveAccess = { userId: AUTHOR_ID, permissions: new Set(), dataScopes: new Map() };
const base = { authors, reader, references: new Map() };
const assemble = (rows: AuditRow[]) => assembleHistory(rows, { ...base, entity: 'users', entityId: USER_ID });

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
    const rows = [row('c1', 'id', null, USER_ID), row('c1', 'name', null, 'GV')].map((r) => ({ ...r, entity: 'tenants' }));
    const [entry] = assembleHistory(rows, { ...base, entity: 'tenants', entityId: USER_ID });

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
    const [entry] = assembleHistory([row('c1', 'description', null, description, { entity: 'access_profiles' })], {
      ...base,
      entity: 'access_profiles',
      entityId: USER_ID,
    });

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

  it('save que só altera uma referência aparece, com o título do campo e os nomes atuais', () => {
    const MEMBERSHIP_ID = '0190a000-0000-7000-8000-0000000000c1';
    const before = '0190a000-0000-7000-8000-0000000000b1';
    const after = '0190a000-0000-7000-8000-0000000000b2';
    const gone = '0190a000-0000-7000-8000-0000000000b3';
    const rows = [
      row('c1', 'user_id', before, after, { entity: 'memberships', entityId: MEMBERSHIP_ID }),
      row('c2', 'user_id', after, gone, { entity: 'memberships', entityId: MEMBERSHIP_ID }),
    ];
    const users = referenceKey({ table: 'users', nameColumn: 'name' });
    const names = new Map([[users, new Map([[before, 'Bruno'], [after, 'Carla']])]]);

    const [deleted, renamed] = assembleHistory(rows, {
      ...base,
      references: names,
      entity: 'memberships',
      entityId: MEMBERSHIP_ID,
    });

    expect(renamed).toMatchObject({ title: 'Usuário alterado', changes: [{ field: 'Usuário', from: 'Bruno', to: 'Carla' }] });
    expect(deleted?.changes).toEqual([{ field: 'Usuário', from: 'Carla', to: DELETED_REFERENCE }]);
    expect(DELETED_REFERENCE).toBe('(registro excluído)');
  });
});

describe('assembleHistory com filhos, referências e jsonb expandido', () => {
  const FARM_ID = '0190a000-0000-7000-8000-00000000f001';
  const OTHER_FARM_ID = '0190a000-0000-7000-8000-00000000f002';
  const DOC_ID = '0190a000-0000-7000-8000-00000000d001';
  const STATUS_OLD = '0190a000-0000-7000-8000-00000000s001';
  const STATUS_NEW = '0190a000-0000-7000-8000-00000000s002';
  const COLLEAGUE_ID = '0190a000-0000-7000-8000-0000000000bb';

  /** Rótulos das chaves do jsonb: na vida real, dado da empresa (`custom_field_defs`). */
  const customFieldLabels: Record<string, string> = { irrigation: 'Irrigação', pivots: 'Pivôs' };
  const expand = (previous: Readonly<Record<string, unknown>> | null, next: Readonly<Record<string, unknown>> | null) =>
    [...new Set([...Object.keys(previous ?? {}), ...Object.keys(next ?? {})])].flatMap((key): ExpandedChange[] => {
      const [from, to] = [previous?.[key], next?.[key]].map((value) => (value === undefined ? null : String(value)));
      return from === to ? [] : [{ label: customFieldLabels[key] ?? key, from: from ?? null, to: to ?? null }];
    });

  const registry = {
    farms: {
      label: 'Fazenda',
      gender: 'f',
      fields: {
        ...RECORD_COLUMNS,
        tenant_id: HIDDEN,
        name: { type: 'text', label: 'Nome' },
        status_id: { type: 'reference', label: 'Status', references: { table: 'farm_statuses', nameColumn: 'name' } },
        custom_fields: { type: 'jsonb', label: 'Campos personalizados', expand },
        notes: { type: 'long_text', label: 'Observações', gender: 'f' },
      },
    },
    farm_documents: {
      label: 'Documento',
      gender: 'm',
      fields: { ...RECORD_COLUMNS, farm_id: HIDDEN, title: { type: 'text', label: 'Título' } },
    },
    farm_brokers: {
      label: 'Corretora',
      gender: 'f',
      fields: {
        ...RECORD_COLUMNS,
        farm_id: HIDDEN,
        user_id: { type: 'reference', label: 'Usuário', references: { table: 'users', nameColumn: 'name' } },
        percent: { type: 'percent', label: 'Percentual' },
      },
    },
  } satisfies Record<string, EntityMeta>;

  const documents: HistoryChildDeclaration = { entity: 'farm_documents', parentColumn: 'farm_id', nameColumn: 'title' };
  // O filtro da quarta camada: sem permissão de ver terceiros, só a própria linha.
  const brokers: HistoryChildDeclaration = {
    entity: 'farm_brokers',
    parentColumn: 'farm_id',
    canSee: (who, child) => child['user_id'] === who.userId,
  };

  const farm = (changeId: string, field: string, oldValue: string | null, newValue: string | null) =>
    row(changeId, field, oldValue, newValue, { entity: 'farms', entityId: FARM_ID });
  const child = (entity: string, entityId: string) =>
    (changeId: string, field: string, oldValue: string | null, newValue: string | null) =>
      row(changeId, field, oldValue, newValue, { entity, entityId });
  const doc = child('farm_documents', DOC_ID);

  const options: AssembleOptions = {
    ...base,
    entity: 'farms',
    entityId: FARM_ID,
    registry,
    children: [documents, brokers],
    references: new Map([
      [referenceKey({ table: 'farm_statuses', nameColumn: 'name' }), new Map([[STATUS_NEW, 'Em negociação']])],
      [referenceKey({ table: 'users', nameColumn: 'name' }), new Map([[AUTHOR_ID, 'Ana Gestora']])],
    ]),
  };
  const assembleFarm = (rows: AuditRow[]) => assembleHistory(rows, options);

  it('filho declarado entra na entrada do mesmo save, como linha própria', () => {
    const [entry] = assembleFarm([
      farm('c1', 'name', 'Boa Vista', 'Boa Vista II'),
      doc('c1', 'id', null, DOC_ID),
      doc('c1', 'farm_id', null, FARM_ID),
      doc('c1', 'title', null, 'Matrícula 12.345'),
    ]);

    expect(entry).toMatchObject({
      changeId: 'c1',
      kind: 'updated',
      title: '2 alterações',
      changes: [{ field: 'Nome', from: 'Boa Vista', to: 'Boa Vista II' }],
      children: [
        {
          title: 'Documento adicionado: Matrícula 12.345',
          changes: [{ field: 'Título', from: null, to: 'Matrícula 12.345' }],
        },
      ],
    });
  });

  it('só um filho no save: o título é o do filho', () => {
    const [entry] = assembleFarm([doc('c1', 'id', null, DOC_ID), doc('c1', 'farm_id', null, FARM_ID), doc('c1', 'title', null, 'CAR')]);

    expect(entry).toMatchObject({ kind: 'updated', title: 'Documento adicionado', changes: [] });
  });

  it('filho excluído é achado pela coluna do pai no valor anterior', () => {
    const [entry] = assembleFarm([
      doc('c9', 'id', DOC_ID, null),
      doc('c9', 'farm_id', FARM_ID, null),
      doc('c9', 'title', 'Matrícula 12.345', null),
    ]);

    expect(entry).toMatchObject({
      title: 'Documento removido',
      children: [{ title: 'Documento removido: Matrícula 12.345', changes: [{ field: 'Título', from: 'Matrícula 12.345', to: null }] }],
    });
  });

  it('filho alterado depois, sem a coluna do pai no save, continua achado pelo cadastro dele', () => {
    const entries = assembleFarm([
      doc('c1', 'id', null, DOC_ID),
      doc('c1', 'farm_id', null, FARM_ID),
      doc('c1', 'title', null, 'CAR'),
      doc('c2', 'title', 'CAR', 'CAR retificado'),
    ]);

    expect(entries[0]).toMatchObject({
      changeId: 'c2',
      title: 'Documento alterado',
      children: [{ title: 'Documento alterado: CAR retificado', changes: [{ field: 'Título', from: 'CAR', to: 'CAR retificado' }] }],
    });
  });

  it('filho de outro registro não entra', () => {
    const other = child('farm_documents', '0190a000-0000-7000-8000-00000000d002');
    const entries = assembleFarm([other('c1', 'id', null, 'x'), other('c1', 'farm_id', null, OTHER_FARM_ID), other('c1', 'title', null, 'CAR')]);

    expect(entries).toEqual([]);
  });

  it('filho que passou para outro registro sai do histórico deste a partir da mudança', () => {
    const entries = assembleFarm([
      doc('c1', 'id', null, DOC_ID),
      doc('c1', 'farm_id', null, FARM_ID),
      doc('c1', 'title', null, 'CAR'),
      doc('c2', 'farm_id', FARM_ID, OTHER_FARM_ID),
      doc('c2', 'title', 'CAR', 'CAR da outra'),
      doc('c3', 'title', 'CAR da outra', 'CAR retificado'),
    ]);

    // O save da mudança ainda é deste registro (a coluna do pai saiu dele); o seguinte, não.
    expect(entries.map((entry) => entry.changeId)).toEqual(['c2', 'c1']);
  });

  it('referência pelo nome atual; referenciado que não existe mais vira "(registro excluído)"', () => {
    const [entry] = assembleFarm([farm('c1', 'status_id', STATUS_OLD, STATUS_NEW)]);

    expect(entry).toMatchObject({
      title: 'Status alterado',
      changes: [{ field: 'Status', from: '(registro excluído)', to: 'Em negociação' }],
    });
  });

  it('referência vazia continua nula', () => {
    const [entry] = assembleFarm([farm('c1', 'status_id', null, STATUS_NEW)]);

    expect(entry?.changes).toEqual([{ field: 'Status', from: null, to: 'Em negociação' }]);
  });

  it('linha barrada pelo filtro de visibilidade não aparece nem conta no título', () => {
    const own = child('farm_brokers', '0190a000-0000-7000-8000-00000000b001');
    const colleague = child('farm_brokers', '0190a000-0000-7000-8000-00000000b002');
    const [entry] = assembleFarm([
      farm('c1', 'name', 'A', 'B'),
      own('c1', 'id', null, 'b1'),
      own('c1', 'farm_id', null, FARM_ID),
      own('c1', 'user_id', null, AUTHOR_ID),
      own('c1', 'percent', null, '50'),
      colleague('c1', 'id', null, 'b2'),
      colleague('c1', 'farm_id', null, FARM_ID),
      colleague('c1', 'user_id', null, COLLEAGUE_ID),
      colleague('c1', 'percent', null, '0.5'),
    ]);

    expect(entry?.title).toBe('2 alterações');
    expect(entry?.children).toEqual([
      {
        title: 'Corretora adicionada',
        changes: [
          { field: 'Usuário', from: null, to: 'Ana Gestora' },
          { field: 'Percentual', from: null, to: '50%' },
        ],
      },
    ]);
  });

  it('o filtro vê a linha inteira do filho, mesmo num save que não grava a coluna que ele lê', () => {
    const colleague = child('farm_brokers', '0190a000-0000-7000-8000-00000000b002');
    const entries = assembleFarm([
      colleague('c1', 'id', null, 'b2'),
      colleague('c1', 'farm_id', null, FARM_ID),
      colleague('c1', 'user_id', null, COLLEAGUE_ID),
      colleague('c2', 'percent', '0.5', '0.4'),
      colleague('c3', 'id', 'b2', null),
      colleague('c3', 'farm_id', FARM_ID, null),
      colleague('c3', 'user_id', COLLEAGUE_ID, null),
      colleague('c3', 'percent', '0.4', null),
    ]);

    // Nenhum dos três saves tem algo que o leitor veja: nenhum vira entrada vazia.
    expect(entries).toEqual([]);
  });

  it('save que só altera um jsonb expandido aparece, com uma alteração por chave e o rótulo do resolvedor', () => {
    const [entry] = assembleFarm([
      farm('c1', 'custom_fields', '{"irrigation":"Não","pivots":2}', '{"irrigation":"Sim","pivots":3,"slope":"plano"}'),
    ]);

    expect(entry).toMatchObject({
      title: '3 alterações',
      changes: [
        { field: 'Irrigação', from: 'Não', to: 'Sim' },
        { field: 'Pivôs', from: '2', to: '3' },
        { field: 'slope', from: null, to: 'plano' },
      ],
    });
  });

  it('chave de jsonb com rótulo feminino: título no gênero dela', () => {
    const feminine = {
      ...registry,
      farms: {
        ...registry.farms,
        fields: {
          ...registry.farms.fields,
          custom_fields: {
            type: 'jsonb',
            label: 'Campos personalizados',
            expand: (): ExpandedChange[] => [{ label: 'Irrigação', gender: 'f', from: 'Não', to: 'Sim' }],
          },
        },
      },
    } satisfies Record<string, EntityMeta>;
    const [entry] = assembleHistory([farm('c1', 'custom_fields', '{}', '{"irrigation":"Sim"}')], { ...options, registry: feminine });

    expect(entry?.title).toBe('Irrigação alterada');
  });

  it('jsonb expandido na ordem do campo dentro do registro', () => {
    const [entry] = assembleFarm([
      farm('c1', 'notes', null, 'ok'),
      farm('c1', 'custom_fields', null, '{"pivots":1}'),
      farm('c1', 'name', 'A', 'B'),
    ]);

    expect(entry?.changes.map((change) => change.field)).toEqual(['Nome', 'Pivôs', 'Observações']);
  });

  it('jsonb sem chave alterada não conta: save só com ele some', () => {
    expect(assembleFarm([farm('c1', 'custom_fields', '{"pivots":1}', '{ "pivots": 1 }')])).toEqual([]);
  });

  it('referencesToResolve junta os ids de referência do registro e dos filhos, por tabela e coluna de nome', () => {
    const own = child('farm_brokers', '0190a000-0000-7000-8000-00000000b001');
    const wanted = referencesToResolve(
      [
        farm('c1', 'status_id', STATUS_OLD, STATUS_NEW),
        farm('c1', 'name', 'A', 'B'),
        own('c1', 'farm_id', null, FARM_ID),
        own('c1', 'user_id', COLLEAGUE_ID, AUTHOR_ID),
      ],
      options,
    );

    expect(wanted).toEqual(
      new Map([
        [referenceKey({ table: 'farm_statuses', nameColumn: 'name' }), { table: 'farm_statuses', nameColumn: 'name', ids: new Set([STATUS_OLD, STATUS_NEW]) }],
        [referenceKey({ table: 'users', nameColumn: 'name' }), { table: 'users', nameColumn: 'name', ids: new Set([COLLEAGUE_ID, AUTHOR_ID]) }],
      ]),
    );
  });
});
