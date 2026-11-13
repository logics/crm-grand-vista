// @vitest-environment jsdom
import '../../support/dom.js';
import type { PermissionCode } from '@crm/shared';
import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { session, stubFakeApi } from '../../support/fake-api.js';
import { renderApp } from '../../support/render-app.js';

const contact = (roles: string[]) => ({
  id: 'c1',
  personType: 'pf',
  name: 'Maria',
  legalName: null,
  taxId: null,
  email: null,
  phone: null,
  whatsapp: null,
  relationshipOrigin: null,
  strategicNotes: null,
  classificationId: null,
  leadSourceId: null,
  roles,
  createdAt: '2026-01-02T10:00:00.000Z',
});

const farmsOfOwner = {
  items: [
    {
      id: 'f1',
      name: 'Fazenda Boa Vista',
      municipality: { ibgeCode: '5218805', name: 'Rio Verde', uf: 'GO' },
      commercialStatus: { id: 's1', name: 'Disponível' },
      isPrimary: true,
    },
    {
      id: 'f2',
      name: 'Fazenda Antiga',
      municipality: { ibgeCode: '5218805', name: 'Rio Verde', uf: 'GO' },
      commercialStatus: { id: 's2', name: 'Desativada' },
      isPrimary: false,
    },
  ],
  total: 2,
  page: 1,
  pageSize: 25,
};

function open(roles: string[], permissions: PermissionCode[]) {
  stubFakeApi({
    session: session(),
    permissions,
    dataScopes: { fazendas: 'all' },
    records: {
      '/e/grand-vista/contacts/c1': contact(roles),
      '/e/grand-vista/contacts/c1/history': { entries: [] },
      '/e/grand-vista/farms/by-owner/c1?page=1&pageSize=25': farmsOfOwner,
    },
  });
  renderApp('/e/grand-vista/contacts/c1');
}

const section = () => document.querySelector<HTMLElement>('[data-section="farms"]');

afterEach(() => vi.unstubAllGlobals());

describe('seção "Fazendas" na ficha do contato', () => {
  it('aparece para o proprietário com fazendas.ver, com o principal marcado, o status em Badge e a contagem', async () => {
    open(['owner'], ['contatos.ver', 'fazendas.ver']);

    const farms = await screen.findByRole('link', { name: 'Fazenda Boa Vista' });
    const card = section()!;
    expect(within(card).getByText('2 fazendas')).toBeVisible();
    expect(farms).toHaveAttribute('href', '/e/grand-vista/farms/f1');
    expect(within(card).getAllByText('Principal')).toHaveLength(1);
    expect(within(card).getByText('Desativada')).toBeVisible();
    expect(within(card).getByText('Disponível')).toBeVisible();
  });

  it('não aparece sem o papel proprietário', async () => {
    open(['buyer'], ['contatos.ver', 'fazendas.ver']);

    await screen.findByRole('heading', { name: 'Maria' });
    expect(section()).toBeNull();
  });

  it('não aparece sem fazendas.ver', async () => {
    open(['owner'], ['contatos.ver']);

    await screen.findByRole('heading', { name: 'Maria' });
    expect(section()).toBeNull();
  });
});
