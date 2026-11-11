// @vitest-environment jsdom
import '../../support/dom.js';
import { act, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { session, stubFakeApi } from '../../support/fake-api.js';
import { renderApp } from '../../support/render-app.js';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const contact = {
  id: 'c1',
  personType: 'pj',
  name: 'Agro Boa Vista',
  legalName: null,
  taxId: null,
  email: null,
  phone: null,
  whatsapp: null,
  relationshipOrigin: null,
  strategicNotes: null,
  roles: ['owner'],
  createdAt: '2026-01-02T10:00:00.000Z',
};

/** API falsa com `PATCH`/`POST` de contato que salvam; a lista de duplicatas vem vazia. */
function stubContact() {
  stubFakeApi({
    session: session(),
    permissions: ['contatos.ver', 'contatos.editar', 'contatos.criar'],
    records: { '/e/grand-vista/contacts/c1': contact },
  });
  const fallback = globalThis.fetch;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (method === 'PATCH') return json(contact);
      if (method === 'POST') return json(contact, 201);
      if (String(input).includes('/contacts/duplicates')) return json({ items: [] });
      return fallback(input, init);
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const leave = (router: { navigate: (to: string) => Promise<void> }) => act(() => void router.navigate('/e/grand-vista/contacts'));

describe('aviso de alteração não salva no formulário de contato', () => {
  it('formulário sujo: sair abre "Sair sem salvar?" e cancelar mantém o digitado', async () => {
    stubContact();
    const { router, pathname } = renderApp('/e/grand-vista/contacts/c1/edit');
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText(/Nome fantasia/), ' Ltda');
    await leave(router);

    expect(await screen.findByRole('dialog', { name: 'Sair sem salvar?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continuar editando' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(pathname()).toBe('/e/grand-vista/contacts/c1/edit');
    expect(screen.getByLabelText(/Nome fantasia/)).toHaveValue('Agro Boa Vista Ltda');
  });

  it('formulário sujo: confirmar sai da página', async () => {
    stubContact();
    const { router, pathname } = renderApp('/e/grand-vista/contacts/c1/edit');
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText(/Nome fantasia/), ' Ltda');
    await leave(router);
    await user.click(await screen.findByRole('button', { name: 'Sair sem salvar' }));

    await waitFor(() => expect(pathname()).toBe('/e/grand-vista/contacts'));
    expect(screen.queryByRole('dialog', { name: 'Sair sem salvar?' })).not.toBeInTheDocument();
  });

  it('formulário limpo sai sem perguntar', async () => {
    stubContact();
    const { router, pathname } = renderApp('/e/grand-vista/contacts/c1/edit');
    await screen.findByLabelText(/Nome fantasia/);

    await leave(router);

    await waitFor(() => expect(pathname()).toBe('/e/grand-vista/contacts'));
    expect(screen.queryByRole('dialog', { name: 'Sair sem salvar?' })).not.toBeInTheDocument();
  });

  it('depois do save bem-sucedido o redirecionamento não abre o aviso (edição)', async () => {
    stubContact();
    const { pathname } = renderApp('/e/grand-vista/contacts/c1/edit');
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText(/Nome fantasia/), ' Ltda');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(pathname()).toBe('/e/grand-vista/contacts/c1'));
    expect(screen.queryByRole('dialog', { name: 'Sair sem salvar?' })).not.toBeInTheDocument();
  });

  it('depois do save bem-sucedido o redirecionamento não abre o aviso (criação)', async () => {
    stubContact();
    const { pathname } = renderApp('/e/grand-vista/contacts/new');
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText(/^Nome/), 'Novo Contato');
    await user.click(screen.getByRole('checkbox', { name: 'Comprador' }));
    await user.click(screen.getByRole('button', { name: 'Cadastrar contato' }));

    await waitFor(() => expect(pathname()).toBe('/e/grand-vista/contacts/c1'));
    expect(screen.queryByRole('dialog', { name: 'Sair sem salvar?' })).not.toBeInTheDocument();
  });

  it('cancelar depois de confirmar o descarte do EntityForm não pergunta de novo', async () => {
    stubContact();
    const { pathname } = renderApp('/e/grand-vista/contacts/c1/edit');
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText(/Nome fantasia/), ' Ltda');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await user.click(await screen.findByRole('button', { name: 'Descartar' }));

    await waitFor(() => expect(pathname()).toBe('/e/grand-vista/contacts/c1'));
    expect(screen.queryByRole('dialog', { name: 'Sair sem salvar?' })).not.toBeInTheDocument();
  });

  it('fechar a aba com o formulário sujo aciona o aviso nativo; limpo, não', async () => {
    stubContact();
    renderApp('/e/grand-vista/contacts/c1/edit');
    const user = userEvent.setup();
    const unload = () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };

    await user.click(await screen.findByLabelText(/Nome fantasia/));
    expect(unload()).toBe(false);
    await user.type(screen.getByLabelText(/Nome fantasia/), ' Ltda');
    await waitFor(() => expect(unload()).toBe(true));
  });
});
