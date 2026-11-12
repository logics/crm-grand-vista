// @vitest-environment jsdom
import '../../support/dom.js';
import type { PermissionCode } from '@crm/shared';
import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { session, stubFakeApi } from '../../support/fake-api.js';
import { renderApp } from '../../support/render-app.js';

const me = session().user;
const rioVerde = { ibgeCode: '5218805', name: 'Rio Verde', uf: 'GO', active: true };
const contact = (id: string, name: string) => ({ id, name, personType: 'pf', taxId: null, roles: ['owner'] });
const joao = contact('0197c000-0000-7000-8000-0000000000d1', 'João');
const maria = contact('0197c000-0000-7000-8000-0000000000d2', 'Maria');
const pedro = contact('0197c000-0000-7000-8000-0000000000d3', 'Pedro');

const farm = (owners: { contactId: string; name: string; isPrimary: boolean }[]) => ({
  id: 'f1',
  name: 'Fazenda Boa Vista',
  municipality: { ibgeCode: rioVerde.ibgeCode, name: rioVerde.name, uf: rioVerde.uf },
  responsible: { id: me.id, name: me.name },
  tradingPost: null,
  commercialStatus: { id: '0197c000-0000-7000-8000-0000000000c1', name: 'Disponível' },
  totalAreaHa: '48.4000',
  usableAreaHa: null,
  owners,
  createdAt: '2026-01-02T10:00:00.000Z',
});

function open(
  path: string,
  { saved = farm([]), permissions = ['fazendas.ver', 'fazendas.criar', 'fazendas.editar', 'contatos.ver'] }: { saved?: ReturnType<typeof farm>; permissions?: PermissionCode[] } = {},
) {
  const writes: { method: string; path: string; body: Record<string, unknown> }[] = [];
  stubFakeApi({
    session: session(),
    permissions,
    dataScopes: { fazendas: 'all' },
    records: {
      '/e/grand-vista/farms/f1': saved,
      '/e/grand-vista/municipalities': { items: [rioVerde] },
      '/e/grand-vista/settings/vocabularies/trading-posts/options': { items: [] },
      '/e/grand-vista/users': { users: [{ ...me, profiles: [] }] },
      '/e/grand-vista/settings': { defaultAlqueireType: 'goiano', areaDisplayUnit: 'hectare' },
    },
  });
  const fallback = globalThis.fetch;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : input);
      const method = init?.method ?? 'GET';
      if (method !== 'GET') {
        writes.push({ method, path: url.pathname, body: JSON.parse(String(init?.body)) as Record<string, unknown> });
        return new Response(JSON.stringify(saved), { status: method === 'POST' ? 201 : 200, headers: { 'content-type': 'application/json' } });
      }
      if (url.pathname.endsWith('/contacts/options')) {
        const ids = url.searchParams.get('ids')?.split(',');
        const items = [joao, maria, pedro].filter((item) => (ids ? ids.includes(item.id) : true));
        return new Response(JSON.stringify({ items }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return fallback(input, init);
    }),
  );
  renderApp(path);
  return { writes };
}

const addOwner = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
  await user.click(await screen.findByRole('button', { name: 'Adicionar proprietário' }));
  await user.click(await screen.findByRole('combobox', { name: 'Novo proprietário' }));
  await user.click(await screen.findByRole('option', { name: new RegExp(name) }));
};

const saved2 = farm([
  { contactId: joao.id, name: 'João', isPrimary: true },
  { contactId: maria.id, name: 'Maria', isPrimary: false },
]);

afterEach(() => vi.unstubAllGlobals());

describe('formulário de fazenda: proprietários', () => {
  it('o primeiro proprietário incluído vira principal, o segundo não', async () => {
    open('/e/grand-vista/farms/new');
    const user = userEvent.setup();

    await addOwner(user, 'João');
    await addOwner(user, 'Maria');

    expect(await screen.findByRole('checkbox', { name: 'Proprietário principal: João' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Proprietário principal: Maria' })).not.toBeChecked();
  });

  it('retirar o principal promove o próximo', async () => {
    open('/e/grand-vista/farms/f1/edit', { saved: saved2 });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Retirar João' }));

    expect(await screen.findByRole('checkbox', { name: 'Proprietário principal: Maria' })).toBeChecked();
  });

  it('abrir e salvar sem mexer nos proprietários não envia owners', async () => {
    const untouched = open('/e/grand-vista/farms/f1/edit', { saved: saved2 });
    const user = userEvent.setup();
    const name = await screen.findByRole('textbox', { name: /Nome/ });
    await user.clear(name);
    await user.type(name, 'Boa Vista II');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(() => expect(untouched.writes).toHaveLength(1));
    expect(untouched.writes[0]!.body).not.toHaveProperty('owners');
  });

  it('trocar o principal envia o conjunto com a nova marca', async () => {
    const api = open('/e/grand-vista/farms/f1/edit', { saved: saved2 });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('checkbox', { name: 'Proprietário principal: Maria' }));
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(api.writes).toHaveLength(1));
    expect(api.writes[0]!.body).toEqual({
      owners: [
        { contactId: joao.id, isPrimary: false },
        { contactId: maria.id, isPrimary: true },
      ],
    });
  });

  it('sem contatos.ver, os proprietários aparecem somente leitura com os nomes, sem incluir', async () => {
    open('/e/grand-vista/farms/f1/edit', { saved: saved2, permissions: ['fazendas.ver', 'fazendas.editar'] });

    expect(await screen.findByDisplayValue('João')).toHaveAttribute('readonly');
    expect(screen.getByDisplayValue('Maria')).toHaveAttribute('readonly');
    expect(screen.queryByRole('button', { name: 'Adicionar proprietário' })).not.toBeInTheDocument();
  });
});
