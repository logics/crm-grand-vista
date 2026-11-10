// @vitest-environment jsdom
import '../../support/dom.js';
import { screen } from '@testing-library/react';
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
  relationshipOrigin: null,
  strategicNotes: null,
  roles: ['owner'],
  createdAt: '2026-01-02T10:00:00.000Z',
};

/** A API falsa de sempre, mais a escrita de contato que ela não conhece: o teste dá a resposta. */
function stubContact(write: () => Response) {
  const writes: string[] = [];
  const api = stubFakeApi({
    session: session(),
    permissions: ['contatos.ver', 'contatos.editar'],
    records: { '/e/grand-vista/contacts/c1': contact },
  });
  const fallback = globalThis.fetch;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
      (init?.method ?? 'GET') === 'PATCH' ? (writes.push(String(init?.body)), write()) : fallback(input, init),
    ),
  );
  return { ...api, writes };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('documento no formulário de contato', () => {
  it('o 409 aparece no campo com o link para o existente, sem perder o digitado', async () => {
    const api = stubContact(() =>
      json(
        {
          error: {
            code: 'conflict',
            message: 'Já existe um contato com este documento.',
            field: 'taxId',
            existing: { id: 'c9', name: 'Fazenda Primeira' },
          },
        },
        409,
      ),
    );
    renderApp('/e/grand-vista/contacts/c1/edit');
    const user = userEvent.setup();

    const input = await screen.findByLabelText('Documento');
    await user.type(input, '12abc34501de35');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    // a mensagem vai ao campo (e o alerta do topo a repete)
    expect((await screen.findAllByText('Já existe um contato com este documento.')).length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Documento')).toBeInvalid();
    const link = await screen.findByRole('link', { name: 'Abrir o cadastro de Fazenda Primeira' });
    expect(link).toHaveAttribute('href', '/e/grand-vista/contacts/c9');
    expect(screen.getByLabelText('Documento')).toHaveValue('12.ABC.345/01DE-35');
    expect(screen.getByLabelText(/Nome fantasia/)).toHaveValue('Agro Boa Vista');
    expect(JSON.parse(api.writes[0]!)).toMatchObject({ taxId: '12ABC34501DE35' });
  });

  it('recusa no próprio formulário, antes da API, um CNPJ com dígito errado', async () => {
    const api = stubContact(() => json({}, 200));
    renderApp('/e/grand-vista/contacts/c1/edit');
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Documento'), '12abc34501de36');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText('Informe um CNPJ válido.')).toBeInTheDocument();
    expect(api.writes).toEqual([]);
  });
});

describe('lista de contatos', () => {
  it('mostra o documento abreviado: CPF mascarado, CNPJ inteiro', async () => {
    stubFakeApi({
      session: session(),
      permissions: ['contatos.ver'],
      records: {
        '/e/grand-vista/contacts': {
          items: [
            { ...contact, id: 'a', name: 'Pessoa', personType: 'pf', taxId: '52998224725' },
            { ...contact, id: 'b', name: 'Empresa', taxId: '12ABC34501DE35' },
          ],
          total: 2,
          page: 1,
          pageSize: 25,
        },
      },
    });
    renderApp('/e/grand-vista/contacts');

    expect(await screen.findByText('***.982.247-**')).toBeInTheDocument();
    expect(screen.getByText('12.ABC.345/01DE-35')).toBeInTheDocument();
  });
});
