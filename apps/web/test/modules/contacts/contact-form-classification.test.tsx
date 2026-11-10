// @vitest-environment jsdom
import '../../support/dom.js';
import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { session, stubFakeApi } from '../../support/fake-api.js';
import { renderApp } from '../../support/render-app.js';

const classA = { id: '0197c000-0000-7000-8000-0000000000a1', name: 'A', active: true };
const referral = { id: '0197c000-0000-7000-8000-0000000000b1', name: 'Indicação', active: true };

const contact = (overrides = {}) => ({
  id: 'c1',
  personType: 'pf',
  name: 'Sebastião',
  legalName: null,
  email: null,
  relationshipOrigin: null,
  strategicNotes: null,
  classificationId: classA.id,
  leadSourceId: referral.id,
  roles: ['buyer', 'owner'],
  createdAt: '2026-01-02T10:00:00.000Z',
  ...overrides,
});

const vocabularies = {
  '/e/grand-vista/settings/vocabularies/contact-classifications/options': { items: [classA] },
  '/e/grand-vista/settings/vocabularies/lead-sources/options': { items: [referral] },
};

const open = (record: unknown) => {
  const api = stubFakeApi({
    session: session(),
    permissions: ['contatos.ver', 'contatos.editar'],
    records: { '/e/grand-vista/contacts/c1': record, ...vocabularies },
  });
  renderApp('/e/grand-vista/contacts/c1/edit');
  return api;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('formulário do contato: classificação e origem do lead', () => {
  it('mostra a classificação e a origem do lead para o comprador', async () => {
    open(contact());

    expect(await screen.findByRole('combobox', { name: /Origem do lead/ })).toBeInTheDocument();
    expect(await screen.findByRole('combobox', { name: /Classificação/ })).toBeInTheDocument();
    expect(await screen.findByText('Indicação')).toBeInTheDocument();
  });

  it('sem o papel comprador a classificação não existe no formulário, e a origem continua', async () => {
    open(contact({ roles: ['owner'], classificationId: null }));

    expect(await screen.findByRole('combobox', { name: /Origem do lead/ })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /Classificação/ })).not.toBeInTheDocument();
  });

  it('retirar o comprador com classificação pede confirmação; cancelar mantém tudo', async () => {
    open(contact());
    const user = userEvent.setup();

    await user.click(await screen.findByRole('checkbox', { name: 'Comprador' }));

    const dialog = await screen.findByRole('alertdialog').catch(() => screen.findByRole('dialog'));
    expect(dialog).toHaveTextContent(/classificação do cliente será apagada/i);
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByRole('checkbox', { name: 'Comprador' })).toBeChecked();
    expect(screen.getByRole('combobox', { name: /Classificação/ })).toBeInTheDocument();
  });

  it('confirmar tira o papel, some com a classificação e envia classificationId nulo', async () => {
    const api = open(contact());
    const user = userEvent.setup();

    await user.click(await screen.findByRole('checkbox', { name: 'Comprador' }));
    await user.click(await screen.findByRole('button', { name: 'Retirar papel' }));

    expect(screen.getByRole('checkbox', { name: 'Comprador' })).not.toBeChecked();
    expect(screen.queryByRole('combobox', { name: /Classificação/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(() => expect(api.requests.some((request) => request.method === 'PATCH')).toBe(true));
    const patch = api.requests.find((request) => request.method === 'PATCH');
    expect(JSON.parse(String(patch?.init?.body))).toMatchObject({ roles: ['owner'], classificationId: null });
  });

  it('retirar o comprador sem classificação não pergunta nada', async () => {
    open(contact({ classificationId: null }));
    const user = userEvent.setup();

    await user.click(await screen.findByRole('checkbox', { name: 'Comprador' }));

    expect(screen.queryByRole('button', { name: 'Retirar papel' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Comprador' })).not.toBeChecked();
  });
});

describe('ficha do contato: classificação e origem do lead', () => {
  const view = (record: unknown) => {
    stubFakeApi({
      session: session(),
      permissions: ['contatos.ver'],
      records: {
        '/e/grand-vista/contacts/c1': record,
        '/e/grand-vista/contacts/c1/history': { entries: [] },
        '/e/grand-vista/settings/vocabularies/contact-classifications/options': { items: [classA] },
        '/e/grand-vista/settings/vocabularies/lead-sources/options': { items: [referral] },
      },
    });
    renderApp('/e/grand-vista/contacts/c1');
  };

  it('mostra os nomes da classificação e da origem do lead', async () => {
    view(contact());

    expect(await screen.findByText('Indicação')).toBeInTheDocument();
    expect(await screen.findByText('Classificação')).toBeInTheDocument();
    expect(await screen.findByText('A')).toBeInTheDocument();
  });

  it('sem o papel comprador a ficha não mostra a classificação', async () => {
    view(contact({ roles: ['owner'], classificationId: null }));

    expect(await screen.findByText('Indicação')).toBeInTheDocument();
    expect(screen.queryByText('Classificação')).not.toBeInTheDocument();
  });
});
