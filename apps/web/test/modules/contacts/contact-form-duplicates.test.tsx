// @vitest-environment jsdom
import '../../support/dom.js';
import type { PermissionCode } from '@crm/shared';
import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { session, stubFakeApi } from '../../support/fake-api.js';
import { renderApp } from '../../support/render-app.js';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const saved = {
  id: 'novo',
  personType: 'pf',
  name: 'Maria Souza',
  legalName: null,
  taxId: null,
  email: null,
  phone: '+5564999990000',
  whatsapp: '+5564999990000',
  relationshipOrigin: null,
  strategicNotes: null,
  classificationId: null,
  leadSourceId: null,
  roles: ['buyer'],
  createdAt: '2026-01-02T10:00:00.000Z',
};

const existing = { id: 'c9', name: 'Sebastião', roles: ['buyer'], reasons: ['phone', 'whatsapp'] };

/** API falsa com a consulta de duplicatas e a escrita de contatos: guarda o que o formulário envia. */
function stubDuplicates(duplicates: () => Response, permissions: PermissionCode[] = ['contatos.ver', 'contatos.criar', 'contatos.editar']) {
  const api = stubFakeApi({
    session: session(),
    permissions,
    records: { '/e/grand-vista/contacts/c1': { ...saved, id: 'c1' } },
  });
  const fallback = globalThis.fetch;
  const calls = { duplicates: [] as URL[], writes: [] as { method: string; body: Record<string, unknown> }[] };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : input);
      const method = init?.method ?? 'GET';
      if (url.pathname.endsWith('/contacts/duplicates')) {
        calls.duplicates.push(url);
        return duplicates();
      }
      if (method === 'POST' || method === 'PATCH') {
        calls.writes.push({ method, body: JSON.parse(String(init?.body)) as Record<string, unknown> });
        return json(saved, method === 'POST' ? 201 : 200);
      }
      return fallback(input, init);
    }),
  );
  return { ...api, calls };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('aviso de duplicata no formulário de contato', () => {
  it('mostra o aviso com motivos e link, não salva, e salva com "Salvar mesmo assim" sem perder o digitado', async () => {
    const { calls } = stubDuplicates(() => json({ items: [existing] }));
    renderApp('/e/grand-vista/contacts/new');
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText(/^Nome/), 'Maria Souza');
    await user.type(screen.getByLabelText(/^Telefone/), '64999990000');
    await user.click(screen.getByRole('checkbox', { name: 'Comprador' }));
    await user.click(screen.getByRole('button', { name: 'Cadastrar contato' }));

    const link = await screen.findByRole('link', { name: 'Sebastião' });
    expect(link).toHaveAttribute('href', '/e/grand-vista/contacts/c9');
    expect(screen.getByText('mesmo telefone, mesmo WhatsApp')).toBeInTheDocument();
    expect(calls.writes).toEqual([]);
    expect(calls.duplicates[0]!.searchParams.get('phone')).toBe('+5564999990000');
    expect(calls.duplicates[0]!.searchParams.get('name')).toBe('Maria Souza');
    expect(calls.duplicates[0]!.searchParams.has('excludeId')).toBe(false);
    expect(screen.getByLabelText(/^Nome/)).toHaveValue('Maria Souza');

    await user.click(screen.getByRole('button', { name: 'Salvar mesmo assim' }));

    await vi.waitFor(() => expect(calls.writes).toHaveLength(1));
    expect(calls.writes[0]).toMatchObject({ method: 'POST', body: { name: 'Maria Souza', phone: '+5564999990000' } });
    expect(calls.duplicates).toHaveLength(1);
  });

  it('sem coincidência, salva direto', async () => {
    const { calls } = stubDuplicates(() => json({ items: [] }));
    renderApp('/e/grand-vista/contacts/new');
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText(/^Nome/), 'Maria Souza');
    await user.click(screen.getByRole('checkbox', { name: 'Comprador' }));
    await user.click(screen.getByRole('button', { name: 'Cadastrar contato' }));

    await vi.waitFor(() => expect(calls.writes).toHaveLength(1));
    expect(screen.queryByRole('button', { name: 'Salvar mesmo assim' })).not.toBeInTheDocument();
  });

  it('na edição, o próprio contato fica fora da consulta', async () => {
    const { calls } = stubDuplicates(() => json({ items: [] }));
    renderApp('/e/grand-vista/contacts/c1/edit');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Salvar alterações' }));

    await vi.waitFor(() => expect(calls.writes).toHaveLength(1));
    expect(calls.duplicates[0]!.searchParams.get('excludeId')).toBe('c1');
  });

  it('se a consulta falha, o cadastro segue', async () => {
    const { calls } = stubDuplicates(() => json({}, 500));
    renderApp('/e/grand-vista/contacts/c1/edit');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Salvar alterações' }));

    await vi.waitFor(() => expect(calls.writes).toHaveLength(1));
  });
});
