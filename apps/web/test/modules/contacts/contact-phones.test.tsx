// @vitest-environment jsdom
import '../../support/dom.js';
import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { session, stubFakeApi } from '../../support/fake-api.js';
import { renderApp } from '../../support/render-app.js';

const contact = (overrides = {}) => ({
  id: 'c1',
  personType: 'pf',
  name: 'Sebastião',
  legalName: null,
  email: 'sebastiao@exemplo.com',
  phone: '+5564999990000',
  whatsapp: '+5564999990000',
  relationshipOrigin: null,
  strategicNotes: null,
  roles: ['buyer'],
  createdAt: '2026-01-02T10:00:00.000Z',
  ...overrides,
});

const page = (items: unknown[]) => ({ items, total: items.length, page: 1, pageSize: 25 });
const permissions = ['contatos.ver', 'contatos.criar', 'contatos.editar'] as const;

/** A API falsa mais a escrita de contatos: guarda o corpo do POST/PATCH e responde 201/200. */
function stubWithWrites(records: Record<string, unknown>) {
  const api = stubFakeApi({ session: session(), permissions: [...permissions], records });
  const reads = globalThis.fetch;
  const writes: { method: string; body: Record<string, unknown> }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      const path = new URL(input instanceof Request ? input.url : input).pathname;
      if ((method === 'POST' || method === 'PATCH') && /\/contacts(\/c1)?$/.test(path)) {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        writes.push({ method, body });
        return new Response(JSON.stringify(contact({ ...body, id: 'c1' })), {
          status: method === 'POST' ? 201 : 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return reads(input, init);
    }),
  );
  return { api, writes };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('lista de contatos: telefone e atalhos', () => {
  it('mostra o telefone formatado e abre o WhatsApp em wa.me, em nova aba, sem abrir a ficha', async () => {
    stubWithWrites({
      '/e/grand-vista/contacts': page([contact({ whatsapp: '+351912345678' })]),
      '/e/grand-vista/contacts/c1': contact(),
    });
    const { pathname } = renderApp('/e/grand-vista/contacts');
    const user = userEvent.setup();

    const row = (await screen.findByText('Sebastião')).closest('tr')!;
    expect(within(row).getByText('(64) 99999-0000')).toBeInTheDocument();
    const whatsapp = within(row).getByRole('link', { name: 'WhatsApp de Sebastião' });
    expect(whatsapp).toHaveAttribute('href', 'https://wa.me/351912345678');
    expect(whatsapp).toHaveAttribute('target', '_blank');
    expect(within(row).getByRole('link', { name: 'Ligar para Sebastião' })).toHaveAttribute('href', 'tel:+5564999990000');
    expect(within(row).getByRole('link', { name: 'Enviar e-mail para Sebastião' })).toHaveAttribute(
      'href',
      'mailto:sebastiao@exemplo.com',
    );

    whatsapp.addEventListener('click', (event) => event.preventDefault());
    await user.click(whatsapp);
    expect(pathname()).toBe('/e/grand-vista/contacts');
  });
});

describe('ficha do contato: telefone e atalhos', () => {
  it('mostra telefone e WhatsApp formatados e os atalhos no cabeçalho', async () => {
    stubWithWrites({ '/e/grand-vista/contacts/c1': contact({ whatsapp: '+351912345678' }), '/e/grand-vista/contacts/c1/history': { entries: [] } });
    renderApp('/e/grand-vista/contacts/c1');

    await screen.findByRole('heading', { name: 'Sebastião' });
    const data = await waitFor(() => {
      const section = document.querySelector<HTMLElement>('[data-section="data"]');
      if (!section) throw new Error('sem seção');
      return section;
    });
    expect(within(data).getByText('(64) 99999-0000')).toBeInTheDocument();
    expect(within(data).getByText('+351912345678')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'WhatsApp de Sebastião' })).toHaveAttribute('href', 'https://wa.me/351912345678');
  });
});

describe('formulário: WhatsApp é o mesmo número', () => {
  it('em contato novo vem marcada e copia o telefone para o WhatsApp ao salvar', async () => {
    const { writes } = stubWithWrites({ '/e/grand-vista/contacts/c1': contact(), '/e/grand-vista/contacts/c1/history': { entries: [] } });
    renderApp('/e/grand-vista/contacts/new');
    const user = userEvent.setup();

    const same = await screen.findByRole('checkbox', { name: 'WhatsApp é o mesmo número' });
    expect(same).toBeChecked();
    await user.type(screen.getByRole('textbox', { name: 'Nome' }), 'Sebastião');
    await user.click(screen.getByRole('checkbox', { name: /Comprador/ }));
    await user.type(screen.getByRole('textbox', { name: 'Telefone' }), '(64) 99999-0000');
    await user.click(screen.getByRole('button', { name: 'Cadastrar contato' }));

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toMatchObject({ method: 'POST', body: { phone: '+5564999990000', whatsapp: '+5564999990000' } });
  });

  it('desmarcada, o WhatsApp é um campo próprio e vale o que foi digitado', async () => {
    const { writes } = stubWithWrites({ '/e/grand-vista/contacts/c1': contact(), '/e/grand-vista/contacts/c1/history': { entries: [] } });
    renderApp('/e/grand-vista/contacts/new');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('checkbox', { name: 'WhatsApp é o mesmo número' }));
    await user.type(screen.getByRole('textbox', { name: 'Nome' }), 'Sebastião');
    await user.click(screen.getByRole('checkbox', { name: /Comprador/ }));
    await user.type(screen.getByRole('textbox', { name: 'Telefone' }), '(64) 3333-4444');
    await user.type(screen.getByRole('textbox', { name: 'WhatsApp' }), '(64) 99999-0000');
    await user.click(screen.getByRole('button', { name: 'Cadastrar contato' }));

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]?.body).toMatchObject({ phone: '+556433334444', whatsapp: '+5564999990000' });
  });

  it('WhatsApp inválido que foi escondido pela opção não barra o salvamento', async () => {
    const { writes } = stubWithWrites({ '/e/grand-vista/contacts/c1': contact(), '/e/grand-vista/contacts/c1/history': { entries: [] } });
    renderApp('/e/grand-vista/contacts/new');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('checkbox', { name: 'WhatsApp é o mesmo número' }));
    await user.type(screen.getByRole('textbox', { name: 'WhatsApp' }), '123');
    await user.click(screen.getByRole('checkbox', { name: 'WhatsApp é o mesmo número' }));
    await user.type(screen.getByRole('textbox', { name: 'Nome' }), 'Sebastião');
    await user.click(screen.getByRole('checkbox', { name: /Comprador/ }));
    await user.type(screen.getByRole('textbox', { name: 'Telefone' }), '(64) 99999-0000');
    await user.click(screen.getByRole('button', { name: 'Cadastrar contato' }));

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]?.body).toMatchObject({ whatsapp: '+5564999990000' });
  });

  it('telefone inválido mostra o erro no campo e não salva', async () => {
    const { writes } = stubWithWrites({});
    renderApp('/e/grand-vista/contacts/new');
    const user = userEvent.setup();

    await user.type(await screen.findByRole('textbox', { name: 'Nome' }), 'Sebastião');
    await user.click(screen.getByRole('checkbox', { name: /Comprador/ }));
    await user.type(screen.getByRole('textbox', { name: 'Telefone' }), '(10) 99999-0000');
    await user.click(screen.getByRole('button', { name: 'Cadastrar contato' }));

    expect(await screen.findByText(/Informe um telefone válido/)).toBeInTheDocument();
    expect(writes).toHaveLength(0);
  });

  it('na edição vem marcada quando telefone e WhatsApp são iguais', async () => {
    stubWithWrites({ '/e/grand-vista/contacts/c1': contact() });
    renderApp('/e/grand-vista/contacts/c1/edit');

    const same = await screen.findByRole('checkbox', { name: 'WhatsApp é o mesmo número' });
    expect(same).toBeChecked();
    expect(screen.getByRole('textbox', { name: 'Telefone' })).toHaveValue('(64) 99999-0000');
    expect(screen.queryByRole('textbox', { name: 'WhatsApp' })).not.toBeInTheDocument();
  });

  it('na edição vem desmarcada quando os números diferem, com o WhatsApp preenchido', async () => {
    stubWithWrites({ '/e/grand-vista/contacts/c1': contact({ whatsapp: '+351912345678' }) });
    renderApp('/e/grand-vista/contacts/c1/edit');

    expect(await screen.findByRole('checkbox', { name: 'WhatsApp é o mesmo número' })).not.toBeChecked();
    expect(screen.getByRole('textbox', { name: 'WhatsApp' })).toHaveValue('+351912345678');
  });
});
