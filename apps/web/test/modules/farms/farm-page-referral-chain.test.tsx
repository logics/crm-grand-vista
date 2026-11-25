// @vitest-environment jsdom
import '../../support/dom.js';
import type { PermissionCode } from '@crm/shared';
import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { session, stubFakeApi } from '../../support/fake-api.js';
import { farmDetail } from '../../support/farm-fixture.js';
import { renderApp } from '../../support/render-app.js';

const chain = [
  { id: 'l1', position: 1, referrer: { kind: 'user', id: 'u1', name: 'Carlos Menezes', linked: true }, notes: 'trouxe direto' },
  { id: 'l2', position: 2, referrer: { kind: 'contact', id: 'c9', name: 'Antônio Prado' }, notes: null },
];

function open(record: unknown, permissions: PermissionCode[] = ['fazendas.ver', 'fazendas.editar']) {
  stubFakeApi({
    session: session(),
    permissions,
    dataScopes: { fazendas: 'all' },
    records: { '/e/grand-vista/farms/f1': record, '/e/grand-vista/farms/f1/history': { entries: [] } },
  });
  return renderApp('/e/grand-vista/farms/f1');
}

afterEach(() => vi.unstubAllGlobals());

describe('cadeia de indicação na ficha da fazenda', () => {
  it('com cadeia: lista ordenada em somente leitura, depois de Dados, sem controle de edição', async () => {
    open(farmDetail(chain));

    const list = await screen.findByRole('list', { name: 'Cadeia de indicação de Fazenda Boa Vista' });
    const items = within(list).getAllByRole('listitem');
    expect(items.map((item) => item.getAttribute('aria-label'))).toEqual(['1. Carlos Menezes', '2. Antônio Prado']);
    expect(items[0]).toHaveTextContent('Interno');
    expect(items[0]).toHaveTextContent('trouxe direto');
    expect(items[1]).toHaveTextContent('Externo');
    expect(within(list).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();

    const headings = screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);
    // A seção vem depois de todos os blocos de Dados (o último é o Técnico).
    expect(headings.indexOf('Cadeia de indicação')).toBe(headings.indexOf('Técnico') + 1);
  });

  it('vazia: mostra "Sem cadeia de indicação" e o atalho leva ao formulário', async () => {
    const { pathname } = open(farmDetail([]));
    const user = userEvent.setup();

    expect(await screen.findByText('Sem cadeia de indicação')).toBeInTheDocument();
    expect(screen.getByText('Quem trouxe esta fazenda ainda não foi registrado.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Registrar indicação' }));

    await waitFor(() => expect(pathname()).toBe('/e/grand-vista/farms/f1/edit'));
  });

  it('vazia, sem fazendas.editar: o estado vazio fica sem o atalho', async () => {
    open(farmDetail([]), ['fazendas.ver']);

    expect(await screen.findByText('Sem cadeia de indicação')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar indicação' })).not.toBeInTheDocument();
  });
});
