// @vitest-environment jsdom
import '../../support/dom.js';
import type { FarmOption } from '@crm/shared';
import { Field } from '@crm/ui';
import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FarmField } from '../../../src/modules/farms/farm-field.js';
import { session, stubFakeApi } from '../../support/fake-api.js';
import { renderApp } from '../../support/render-app.js';

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

const santaRita: FarmOption = {
  id: '0199c1d2-7a4b-7c3e-9f10-0000000000f1',
  name: 'Fazenda Santa Rita',
  municipality: { ibgeCode: '5218805', name: 'Rio Verde', uf: 'GO' },
  totalAreaHa: '1000.0000',
};
const boaVista: FarmOption = { ...santaRita, id: '0199c1d2-7a4b-7c3e-9f10-0000000000f2', name: 'Fazenda Boa Vista' };

function stubFarms() {
  stubFakeApi({ session: session(), permissions: ['fazendas.ver'] });
  const fallback = globalThis.fetch;
  const options: URL[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : input);
      if (url.pathname.endsWith('/farms/options')) {
        options.push(url);
        const ids = url.searchParams.get('ids');
        const term = url.searchParams.get('q')?.toLowerCase() ?? '';
        const all = [santaRita, boaVista];
        return json({ items: ids ? all.filter((farm) => ids.split(',').includes(farm.id)) : all.filter((farm) => farm.name.toLowerCase().includes(term)) });
      }
      return fallback(input, init);
    }),
  );
  return options;
}

function Host({ initial = null }: { initial?: FarmOption | string | null }) {
  const [value, setValue] = useState<FarmOption | string | null>(initial);
  return (
    <>
      <Field label="Fazenda">
        <FarmField value={value} onChange={setValue} />
      </Field>
      <output data-testid="chosen">{typeof value === 'object' && value ? value.id : ''}</output>
    </>
  );
}

const mount = (initial?: FarmOption | string | null) =>
  renderApp('/e/grand-vista/field-host', { tenantPages: [{ path: 'field-host', element: <Host initial={initial} /> }] });

afterEach(() => vi.unstubAllGlobals());

describe('FarmField', () => {
  it('busca em /farms/options da empresa e devolve a fazenda escolhida', async () => {
    const options = stubFarms();
    mount();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('combobox', { name: 'Fazenda' }));
    await user.type(screen.getByPlaceholderText('Buscar fazenda'), 'boa');
    await waitFor(() => expect(options.some((url) => url.pathname === '/e/grand-vista/farms/options' && url.searchParams.get('q') === 'boa')).toBe(true));
    await user.click(await screen.findByRole('option', { name: /Fazenda Boa Vista/ }));

    await waitFor(() => expect(screen.getByTestId('chosen')).toHaveTextContent(boaVista.id));
  });

  it('hidrata o valor gravado por ids', async () => {
    const options = stubFarms();
    mount(santaRita.id);

    expect(await screen.findByRole('combobox', { name: 'Fazenda' })).toHaveTextContent('Fazenda Santa Rita');
    expect(options.some((url) => url.searchParams.get('ids') === santaRita.id)).toBe(true);
  });
});
