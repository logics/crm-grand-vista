// Campo que exige permissão própria (`requiresPermission`): o histórico mostra a
// alteração com o rótulo e a mensagem, sem os valores, para quem não a tem.
// Genérico: vale para campo do registro e de filho, de qualquer entidade.
import { HIDDEN, HISTORY_RESTRICTED_MESSAGE, RECORD_COLUMNS, type EntityMeta, type PermissionCode } from '@crm/shared';
import { describe, expect, it } from 'vitest';
import type { EffectiveAccess } from '../../src/authorization/effective-access.js';
import { assembleHistory, type AuditRow, type HistoryChildDeclaration } from '../../src/history/assemble.js';

const CONTACT_ID = '0190a000-0000-7000-8000-0000000000c1';
const PROFILE_ID = '0190a000-0000-7000-8000-0000000000b1';
const AUTHOR_ID = '0190a000-0000-7000-8000-0000000000aa';
const PERMISSION: PermissionCode = 'contatos.ver_dados_financeiros';

const registry = {
  contacts: {
    label: 'Contato',
    gender: 'm',
    fields: {
      ...RECORD_COLUMNS,
      tenant_id: HIDDEN,
      name: { type: 'text', label: 'Nome' },
      secret_note: { type: 'text', label: 'Anotação reservada', gender: 'f', requiresPermission: PERMISSION },
    },
  },
  buyer_profiles: {
    label: 'Perfil de compra',
    gender: 'm',
    fields: {
      ...RECORD_COLUMNS,
      tenant_id: HIDDEN,
      contact_id: HIDDEN,
      urgency: { type: 'text', label: 'Urgência da compra', gender: 'f' },
      estimated_net_worth: { type: 'money', label: 'Patrimônio estimado', requiresPermission: PERMISSION },
    },
  },
} satisfies Record<string, EntityMeta>;

const children: HistoryChildDeclaration[] = [{ entity: 'buyer_profiles', parentColumn: 'contact_id' }];

let nextId = 1;
const audit = (
  entity: string,
  entityId: string,
  changeId: string,
  field: string,
  oldValue: string | null,
  newValue: string | null,
): AuditRow => ({
  id: nextId++,
  entity,
  entityId,
  changeId,
  field,
  oldValue,
  newValue,
  userId: AUTHOR_ID,
  createdAt: new Date('2026-07-24T17:30:00.000Z'),
});
const contact = (changeId: string, field: string, from: string | null, to: string | null) =>
  audit('contacts', CONTACT_ID, changeId, field, from, to);
const profile = (changeId: string, field: string, from: string | null, to: string | null) =>
  audit('buyer_profiles', PROFILE_ID, changeId, field, from, to);

const access = (...permissions: PermissionCode[]): EffectiveAccess => ({
  userId: AUTHOR_ID,
  permissions: new Set(permissions),
  dataScopes: new Map(),
});
const assemble = (rows: AuditRow[], reader: EffectiveAccess) =>
  assembleHistory(rows, {
    entity: 'contacts',
    entityId: CONTACT_ID,
    registry,
    children,
    authors: new Map([[AUTHOR_ID, 'Ana Gestora']]),
    references: new Map(),
    reader,
  });

const masked = (field: string) => ({ field, from: null, to: null, restricted: HISTORY_RESTRICTED_MESSAGE });

describe('campo que exige permissão, no registro', () => {
  const rows = [contact('c1', 'secret_note', 'velho', 'novo')];

  it('sem a permissão: rótulo e mensagem, sem valores; o save continua entrada e dá o título', () => {
    const [entry] = assemble(rows, access());
    expect(entry).toMatchObject({ title: 'Anotação reservada alterada', changes: [masked('Anotação reservada')] });
    expect(JSON.stringify(entry)).not.toMatch(/velho|novo/);
  });

  it('com a permissão: os valores aparecem', () => {
    const [entry] = assemble(rows, access(PERMISSION));
    expect(entry?.changes).toEqual([{ field: 'Anotação reservada', from: 'velho', to: 'novo' }]);
  });

  it('campo mascarado e campo livre no mesmo save: só o primeiro perde os valores', () => {
    const [entry] = assemble([contact('c1', 'name', 'A', 'B'), contact('c1', 'secret_note', null, 'x')], access());
    expect(entry?.title).toBe('2 alterações');
    expect(entry?.changes).toEqual([{ field: 'Nome', from: 'A', to: 'B' }, masked('Anotação reservada')]);
  });
});

describe('campo que exige permissão, em filho', () => {
  const created = [
    profile('c1', 'id', null, PROFILE_ID),
    profile('c1', 'contact_id', null, CONTACT_ID),
    profile('c1', 'urgency', null, 'high'),
    profile('c1', 'estimated_net_worth', null, '9000000.00'),
  ];
  const onlyFinancial = [profile('c2', 'estimated_net_worth', '9000000.00', '12000000.00')];
  const removed = [
    profile('c3', 'id', PROFILE_ID, null),
    profile('c3', 'contact_id', CONTACT_ID, null),
    profile('c3', 'urgency', 'high', null),
    profile('c3', 'estimated_net_worth', '12000000.00', null),
  ];

  it('sem a permissão: a linha do filho mascara o campo e deixa os demais', () => {
    const [entry] = assemble(created, access());
    expect(entry?.children[0]).toEqual({
      title: 'Perfil de compra adicionado',
      changes: [{ field: 'Urgência da compra', from: null, to: 'high' }, masked('Patrimônio estimado')],
    });
  });

  it('save que só mexeu no campo mascarado continua entrada e conta no título', () => {
    const [entry] = assemble([...created, ...onlyFinancial], access());
    expect(entry).toMatchObject({
      title: 'Perfil de compra alterado',
      children: [{ title: 'Perfil de compra alterado', changes: [masked('Patrimônio estimado')] }],
    });
  });

  it('exclusão do perfil: o valor anterior não vaza', () => {
    const entries = assemble([...created, ...onlyFinancial, ...removed], access());
    const [entry] = entries;
    expect(entry?.children[0]?.title).toBe('Perfil de compra removido');
    expect(entry?.children[0]?.changes).toContainEqual(masked('Patrimônio estimado'));
    expect(JSON.stringify(entries)).not.toMatch(/9000000|12000000|9\.000\.000|12\.000\.000/);
  });

  it('com a permissão: os valores aparecem, também na exclusão', () => {
    const [entry] = assemble([...created, ...removed], access(PERMISSION));
    const worth = entry?.children[0]?.changes.find((change) => change.field === 'Patrimônio estimado');
    expect(worth).toMatchObject({ from: expect.stringContaining('12.000.000'), to: null });
    expect(worth).not.toHaveProperty('restricted');
  });
});
