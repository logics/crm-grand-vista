// @vitest-environment jsdom
import '../../support/dom.js';
import { type TenantSettings } from '@crm/shared';
import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAreaFormatter } from '../../../src/modules/settings/display-context.js';
import { session, stubFakeApi } from '../../support/fake-api.js';
import { renderApp } from '../../support/render-app.js';

const SETTINGS_PATH = '/e/grand-vista/settings';
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** A API falsa de sempre, mais o `PATCH /settings`, que ela não conhece. */
function stubSettings(settings: TenantSettings, patches: unknown[] = []) {
  stubFakeApi({
    session: session(),
    permissions: ['configuracoes.gerenciar'],
    records: { [SETTINGS_PATH]: settings },
  });
  const fallback = globalThis.fetch;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method !== 'PATCH') return fallback(input, init);
      const body = JSON.parse(String(init.body)) as Partial<TenantSettings>;
      patches.push(body);
      return json({ ...settings, ...body });
    }),
  );
  return patches;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Página de teste que exibe uma área pela formatação do sistema. */
function AreaProbe() {
  const formatArea = useAreaFormatter();
  return <p>Área: {formatArea('48.4')}</p>;
}

describe('formatação de área pelos parâmetros da empresa ativa', () => {
  it.each([
    [{ defaultAlqueireType: 'goiano', areaDisplayUnit: 'hectare' }, '48,4 ha'],
    [{ defaultAlqueireType: 'goiano', areaDisplayUnit: 'alqueire' }, '10 alq. goiano'],
    [{ defaultAlqueireType: 'paulista', areaDisplayUnit: 'alqueire' }, '20 alq. paulista'],
  ] as const)('com %o mostra %s', async (settings, expected) => {
    stubSettings(settings);
    renderApp('/e/grand-vista/probe', { tenantPages: [{ path: 'probe', element: <AreaProbe /> }] });

    expect(await screen.findByText(`Área: ${expected}`)).toBeInTheDocument();
  });
});

describe('tela de Parâmetros', () => {
  it('mostra os valores atuais e grava a troca', async () => {
    const patches = stubSettings({ defaultAlqueireType: 'goiano', areaDisplayUnit: 'hectare' });
    renderApp('/e/grand-vista/settings/parameters');

    expect(await screen.findByRole('heading', { name: 'Parâmetros' })).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('combobox', { name: 'Unidade de exibição de área' }));
    await user.click(await screen.findByRole('option', { name: 'Alqueire' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(patches).toEqual([{ defaultAlqueireType: 'goiano', areaDisplayUnit: 'alqueire' }]));
    expect(await screen.findByText('Parâmetros salvos.')).toBeInTheDocument();
  });
});
