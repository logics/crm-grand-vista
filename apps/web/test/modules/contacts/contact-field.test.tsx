// @vitest-environment jsdom
import '../../support/dom.js';
import type { ContactOption, PermissionCode } from '@crm/shared';
import { Field } from '@crm/ui';
import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContactField } from '../../../src/modules/contacts/contact-field.js';
import { session, stubFakeApi } from '../../support/fake-api.js';
import { renderApp } from '../../support/render-app.js';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const joao: ContactOption = {
  id: '0199c1d2-7a4b-7c3e-9f10-000000000001',
  name: 'João Comprador',
  personType: 'pf',
  taxId: null,
  roles: ['buyer'],
};
const dona: ContactOption = { ...joao, id: '0199c1d2-7a4b-7c3e-9f10-000000000002', name: 'Dona Fazenda', roles: ['owner'] };
const created = {
  id: '0199c1d2-7a4b-7c3e-9f10-000000000009',
  personType: 'pf',
  name: 'Sebastião Novo',
  legalName: null,
  taxId: null,
  email: null,
  phone: null,
  whatsapp: null,
  relationshipOrigin: null,
  strategicNotes: null,
  classificationId: null,
  leadSourceId: null,
  roles: ['owner'],
  createdAt: '2026-01-02T10:00:00.000Z',
};

interface Calls {
  options: URL[];
  duplicates: URL[];
  writes: Record<string, unknown>[];
}

/** API falsa de contatos: opções, duplicatas e criação; o resto é da API falsa base. */
function stubContacts({
  permissions = ['contatos.ver', 'contatos.criar'],
  items = [dona, joao],
  duplicates = [] as unknown[],
  write = () => json(created, 201),
}: { permissions?: PermissionCode[]; items?: ContactOption[]; duplicates?: unknown[]; write?: () => Response } = {}) {
  stubFakeApi({ session: session(), permissions });
  const fallback = globalThis.fetch;
  const calls: Calls = { options: [], duplicates: [], writes: [] };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : input);
      const method = init?.method ?? 'GET';
      if (url.pathname.endsWith('/contacts/options')) {
        calls.options.push(url);
        const ids = url.searchParams.get('ids');
        const term = url.searchParams.get('q')?.toLowerCase() ?? '';
        const found = ids
          ? items.filter((item) => ids.split(',').includes(item.id)).map((item) => ({ ...item, personType: permissions.includes('contatos.ver') ? item.personType : null }))
          : items.filter((item) => item.name.toLowerCase().includes(term));
        return json({ items: found });
      }
      if (url.pathname.endsWith('/contacts/duplicates')) {
        calls.duplicates.push(url);
        return json({ items: duplicates });
      }
      if (url.pathname.endsWith('/contacts') && method === 'POST') {
        calls.writes.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
        return write();
      }
      return fallback(input, init);
    }),
  );
  return calls;
}

/** `onParentSubmit` simula o formulário da ficha que contém o campo: o diálogo não pode vazar o submit para ele. */
function Host({ initial = null, onParentSubmit }: { initial?: ContactOption | string | null; onParentSubmit?: () => void }) {
  const [value, setValue] = useState<ContactOption | string | null>(initial);
  const content = (
    <>
      <Field label="Proprietário">
        <ContactField role="owner" value={value} onChange={setValue} />
      </Field>
      <output data-testid="chosen">{typeof value === 'object' && value ? value.id : ''}</output>
    </>
  );
  return onParentSubmit ? <form onSubmit={onParentSubmit}>{content}</form> : content;
}

const mount = (initial?: ContactOption | string | null, onParentSubmit?: () => void) =>
  renderApp('/e/grand-vista/field-host', {
    tenantPages: [{ path: 'field-host', element: <Host initial={initial} onParentSubmit={onParentSubmit} /> }],
  });

afterEach(() => vi.unstubAllGlobals());

describe('ContactField', () => {
  it('busca na API da empresa com o papel pedido e marca a opção fora do papel', async () => {
    const calls = stubContacts();
    mount();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('combobox', { name: 'Proprietário' }));

    const options = await screen.findAllByRole('option');
    expect(options[0]).not.toHaveTextContent('vira');
    expect(within(options[1]!).getByText('vira proprietário ao salvar')).toBeVisible();
    expect(calls.options[0]!.searchParams.get('role')).toBe('owner');
  });

  it('cadastra pelo diálogo rápido, com o termo e o papel já preenchidos, e devolve o contato selecionado', async () => {
    const calls = stubContacts({ items: [] });
    mount();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('combobox', { name: 'Proprietário' }));
    await user.type(screen.getByPlaceholderText('Buscar contato'), 'Sebastião Novo');
    await screen.findByText('Nenhum resultado para “Sebastião Novo”');
    await user.click(screen.getByRole('button', { name: 'Cadastrar contato' }));

    const dialog = await screen.findByRole('dialog', { name: 'Cadastrar contato' });
    expect(within(dialog).getByLabelText(/^Nome/)).toHaveValue('Sebastião Novo');
    expect(within(dialog).getByRole('checkbox', { name: 'Proprietário' })).toBeChecked();
    expect(within(dialog).getByRole('checkbox', { name: 'Comprador' })).not.toBeChecked();
    await user.click(within(dialog).getByRole('button', { name: 'Cadastrar contato' }));

    await waitFor(() => expect(screen.getByTestId('chosen')).toHaveTextContent(created.id));
    expect(calls.writes[0]).toMatchObject({ name: 'Sebastião Novo', personType: 'pf', roles: ['owner'] });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Proprietário' })).toHaveTextContent('Sebastião Novo');
  });

  it('passa pelo aviso de duplicata: não grava, mostra o link e grava com "Salvar mesmo assim"', async () => {
    const calls = stubContacts({
      items: [],
      duplicates: [{ id: 'c9', name: 'Sebastião Antigo', roles: ['buyer'], reasons: ['name'] }],
    });
    mount();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('combobox', { name: 'Proprietário' }));
    await user.type(screen.getByPlaceholderText('Buscar contato'), 'Sebastião Novo');
    await screen.findByText('Nenhum resultado para “Sebastião Novo”');
    await user.click(screen.getByRole('button', { name: 'Cadastrar contato' }));
    const dialog = await screen.findByRole('dialog');

    await user.click(within(dialog).getByRole('button', { name: 'Cadastrar contato' }));

    expect(await within(dialog).findByRole('link', { name: 'Sebastião Antigo' })).toHaveAttribute('href', '/e/grand-vista/contacts/c9');
    expect(calls.writes).toEqual([]);
    await user.click(within(dialog).getByRole('button', { name: 'Salvar mesmo assim' }));

    await waitFor(() => expect(calls.writes).toHaveLength(1));
    await waitFor(() => expect(screen.getByTestId('chosen')).toHaveTextContent(created.id));
    expect(calls.duplicates).toHaveLength(1);
  });

  it('o submit do diálogo não vaza para o formulário da ficha, nem ao cadastrar nem em "Salvar mesmo assim"', async () => {
    const parentSubmit = vi.fn();
    const calls = stubContacts({
      items: [],
      duplicates: [{ id: 'c9', name: 'Sebastião Antigo', roles: ['buyer'], reasons: ['name'] }],
    });
    mount(null, parentSubmit);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('combobox', { name: 'Proprietário' }));
    await user.type(screen.getByPlaceholderText('Buscar contato'), 'Sebastião Novo');
    await screen.findByText('Nenhum resultado para “Sebastião Novo”');
    await user.click(screen.getByRole('button', { name: 'Cadastrar contato' }));
    const dialog = await screen.findByRole('dialog');

    await user.click(within(dialog).getByRole('button', { name: 'Cadastrar contato' }));
    await within(dialog).findByRole('link', { name: 'Sebastião Antigo' });
    expect(parentSubmit).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Salvar mesmo assim' }));
    await waitFor(() => expect(calls.writes).toHaveLength(1));
    await waitFor(() => expect(screen.getByTestId('chosen')).toHaveTextContent(created.id));
    expect(parentSubmit).not.toHaveBeenCalled();
  });

  it('o 409 do documento aparece no campo com o link para o existente, sem fechar nem perder o digitado', async () => {
    stubContacts({
      items: [],
      write: () =>
        json({ error: { code: 'conflict', message: 'Já existe um contato com este documento.', field: 'taxId', existing: { id: 'c7', name: 'Fulano Existente' } } }, 409),
    });
    mount();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('combobox', { name: 'Proprietário' }));
    await user.type(screen.getByPlaceholderText('Buscar contato'), 'Sebastião Novo');
    await screen.findByText('Nenhum resultado para “Sebastião Novo”');
    await user.click(screen.getByRole('button', { name: 'Cadastrar contato' }));
    const dialog = await screen.findByRole('dialog');

    await user.type(within(dialog).getByLabelText(/^CPF|^Documento/), '52998224725');
    await user.click(within(dialog).getByRole('button', { name: 'Cadastrar contato' }));

    expect(await within(dialog).findByText('Já existe um contato com este documento.')).toBeVisible();
    expect(within(dialog).getByRole('link', { name: 'Abrir o cadastro de Fulano Existente' })).toHaveAttribute('href', '/e/grand-vista/contacts/c7');
    expect(within(dialog).getByLabelText(/^Nome/)).toHaveValue('Sebastião Novo');
    expect(screen.getByTestId('chosen')).toBeEmptyDOMElement();
  });

  it('sem contatos.criar não há "Cadastrar"', async () => {
    stubContacts({ permissions: ['contatos.ver'], items: [] });
    mount();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('combobox', { name: 'Proprietário' }));
    await screen.findByText('Nenhum resultado');

    expect(screen.queryByRole('button', { name: /Cadastrar/ })).not.toBeInTheDocument();
  });

  it('sem contatos.ver, é somente leitura e mostra o nome hidratado', async () => {
    stubContacts({ permissions: [] });
    mount(dona.id);

    const field = await screen.findByRole('textbox', { name: 'Proprietário' });
    await waitFor(() => expect(field).toHaveValue('Dona Fazenda'));
    expect(field).toHaveAttribute('readonly');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});
