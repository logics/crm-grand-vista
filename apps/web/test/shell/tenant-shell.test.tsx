// @vitest-environment jsdom
import '../support/dom.js';
import { TENANT_BLOCKED_MESSAGE, TENANT_NOT_FOUND_MESSAGE } from '@crm/shared';
import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useParams } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { env } from '../../src/env.js';
import { ResourceNotFoundError, useTenantQuery } from '../../src/shell/tenant-query.js';
import { session, sessionTenant, stubFakeApi } from '../support/fake-api.js';
import { renderApp } from '../support/render-app.js';

const tenant = (slug: string, name: string, options: { isDefault?: boolean; blocked?: boolean } = {}) =>
  sessionTenant(slug, { name, ...options });

const grandVista = tenant('grand-vista', 'Grand Vista', { isDefault: true });
const norte = tenant('fazendas-norte', 'Fazendas Norte');
const twoTenants = session({ tenants: [grandVista, norte] });

/**
 * Página de fazenda só do teste: lê o registro sob a empresa da URL. A API não
 * tem rota de fazenda ainda, então a busca vai por `fetch` direto à API falsa,
 * não pelo cliente RPC; o que se exercita é `useTenantQuery` e a casca.
 */
function FarmPage() {
  const { id } = useParams();
  const farm = useTenantQuery(['farms', id], async (slug) => {
    const response = await fetch(`${env.VITE_API_URL}/e/${slug}/farms/${id}`, { credentials: 'include' });
    if (response.status === 404) throw new ResourceNotFoundError();
    return (await response.json()) as { name: string };
  });
  return farm.data ? <p>Fazenda: {farm.data.name}</p> : null;
}

const farmPages = [{ path: 'farms/:id', element: <FarmPage /> }];

/** O menu de conta, pelo nome do usuário no gatilho. */
const accountMenu = () => screen.findByRole('button', { name: /Ana Ribeiro/ });

async function openAccountMenu() {
  await userEvent.setup().click(await accountMenu());
}

async function chooseTenant(name: string) {
  await openAccountMenu();
  await userEvent.setup().click(await screen.findByRole('option', { name: new RegExp(name) }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('seletor de empresa, no menu de conta', () => {
  it('não aparece para quem tem um vínculo só', async () => {
    stubFakeApi({ session: session({ tenants: [grandVista] }) });
    renderApp('/e/grand-vista');

    await openAccountMenu();

    expect(await screen.findByRole('option', { name: 'Sair' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Grand Vista/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Empresa' })).not.toBeInTheDocument();
  });

  it('mostra a empresa ativa e leva à raiz da outra', async () => {
    stubFakeApi({ session: twoTenants });
    const app = renderApp('/e/grand-vista');

    expect(await accountMenu()).toHaveAccessibleName('Ana Ribeiro, Grand Vista');
    await openAccountMenu();
    expect(await screen.findByRole('option', { name: /Grand Vista/ })).toHaveAttribute('aria-current', 'true');
    await userEvent.setup().click(screen.getByRole('option', { name: /Fazendas Norte/ }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Fazendas Norte' })).toBeInTheDocument();
    expect(app.pathname()).toBe('/e/fazendas-norte');
  });

  it('marca a empresa bloqueada', async () => {
    stubFakeApi({ session: session({ tenants: [grandVista, tenant('sul', 'Agro Sul', { blocked: true })] }) });
    renderApp('/e/grand-vista');

    await openAccountMenu();

    expect(await screen.findByRole('option', { name: /Agro Sul/ })).toHaveTextContent('Bloqueada');
    expect(screen.getByRole('option', { name: /Grand Vista/ })).not.toHaveTextContent('Bloqueada');
  });

  it('leva ao mesmo recurso sob o outro slug quando ele existe lá', async () => {
    stubFakeApi({
      session: twoTenants,
      records: { '/e/grand-vista/farms/7': { name: 'Santa Fé' }, '/e/fazendas-norte/farms/7': { name: 'Boa Vista' } },
    });
    const app = renderApp('/e/grand-vista/farms/7', { tenantPages: farmPages });

    await screen.findByText('Fazenda: Santa Fé');
    await chooseTenant('Fazendas Norte');

    expect(await screen.findByText('Fazenda: Boa Vista')).toBeInTheDocument();
    expect(screen.queryByText('Fazenda: Santa Fé')).not.toBeInTheDocument();
    expect(app.pathname()).toBe('/e/fazendas-norte/farms/7');
  });

  it('leva à raiz da empresa quando o recurso não existe lá, sem mostrar o da anterior', async () => {
    stubFakeApi({ session: twoTenants, records: { '/e/grand-vista/farms/7': { name: 'Santa Fé' } } });
    const app = renderApp('/e/grand-vista/farms/7', { tenantPages: farmPages });

    await screen.findByText('Fazenda: Santa Fé');
    await chooseTenant('Fazendas Norte');

    await waitFor(() => expect(app.pathname()).toBe('/e/fazendas-norte'));
    expect(await screen.findByRole('heading', { level: 1, name: 'Fazendas Norte' })).toBeInTheDocument();
    expect(screen.queryByText(/Santa Fé/)).not.toBeInTheDocument();
  });

  it('voltar à empresa anterior não reaproveita o recurso da outra', async () => {
    stubFakeApi({
      session: twoTenants,
      records: { '/e/grand-vista/farms/7': { name: 'Santa Fé' }, '/e/fazendas-norte/farms/7': { name: 'Boa Vista' } },
    });
    const app = renderApp('/e/grand-vista/farms/7', { tenantPages: farmPages });

    await screen.findByText('Fazenda: Santa Fé');
    await chooseTenant('Fazendas Norte');
    await screen.findByText('Fazenda: Boa Vista');
    await app.router.navigate(-1);

    expect(await screen.findByText('Fazenda: Santa Fé')).toBeInTheDocument();
    expect(screen.queryByText('Fazenda: Boa Vista')).not.toBeInTheDocument();
  });
});

describe('recurso inexistente fora da troca de empresa', () => {
  it('diz que o registro não existe, sem sair da página', async () => {
    stubFakeApi({ session: twoTenants });
    const app = renderApp('/e/grand-vista/farms/404', { tenantPages: farmPages });

    expect(await screen.findByRole('heading', { name: 'Registro não encontrado' })).toBeInTheDocument();
    expect(app.pathname()).toBe('/e/grand-vista/farms/404');
    expect(screen.getByRole('link', { name: 'Ir para o início da empresa' })).toHaveAttribute('href', '/e/grand-vista');
  });
});

describe('empresa inacessível', () => {
  it('mostra a mensagem única e as empresas do usuário, como links', async () => {
    stubFakeApi({ session: twoTenants });
    renderApp('/e/outra-empresa');

    expect(await screen.findByRole('heading', { name: TENANT_NOT_FOUND_MESSAGE })).toBeInTheDocument();
    const list = screen.getByRole('navigation', { name: 'Suas empresas' });
    expect(within(list).getByRole('link', { name: 'Grand Vista' })).toHaveAttribute('href', '/e/grand-vista');
    expect(within(list).getByRole('link', { name: 'Fazendas Norte' })).toHaveAttribute('href', '/e/fazendas-norte');
    expect(screen.queryByRole('button', { name: /Ana Ribeiro/ })).not.toBeInTheDocument();
  });

  it('o link leva à empresa escolhida', async () => {
    stubFakeApi({ session: twoTenants });
    const app = renderApp('/e/outra-empresa');

    await userEvent.setup().click(await screen.findByRole('link', { name: 'Fazendas Norte' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Fazendas Norte' })).toBeInTheDocument();
    expect(app.pathname()).toBe('/e/fazendas-norte');
  });

  it('o teclado navega pelo menu: setas escolhem a empresa, Enter troca', async () => {
    stubFakeApi({ session: twoTenants });
    const app = renderApp('/e/grand-vista');
    const user = userEvent.setup();

    await user.click(await accountMenu());
    await screen.findByRole('option', { name: /Fazendas Norte/ });
    await user.keyboard('{ArrowDown}{Enter}');

    expect(await screen.findByRole('heading', { level: 1, name: 'Fazendas Norte' })).toBeInTheDocument();
    expect(app.pathname()).toBe('/e/fazendas-norte');
  });

  it('o super admin entra pela URL numa empresa sem vínculo, e o seletor continua só com as vinculadas', async () => {
    stubFakeApi({ session: twoTenants, extraTenants: ['agro-leste'] });
    renderApp('/e/agro-leste');

    expect(await accountMenu()).toHaveTextContent('agro-leste');
    expect(screen.queryByText(TENANT_NOT_FOUND_MESSAGE)).not.toBeInTheDocument();
    await openAccountMenu();

    const tenants = within(await screen.findByRole('group', { name: 'Empresa' })).getAllByRole('option');
    expect(tenants.map((option) => option.textContent)).toEqual(['Grand Vista', 'Fazendas Norte']);
    for (const option of tenants) expect(option).not.toHaveAttribute('aria-current');
  });
});

describe('empresa bloqueada', () => {
  const blocked = session({ tenants: [tenant('sul', 'Agro Sul', { isDefault: true, blocked: true }), norte] });

  it('mostra a mensagem própria e as outras empresas do usuário', async () => {
    stubFakeApi({ session: blocked });
    renderApp('/e/sul');

    expect(await screen.findByRole('heading', { name: TENANT_BLOCKED_MESSAGE })).toBeInTheDocument();
    const list = screen.getByRole('navigation', { name: 'Suas empresas' });
    expect(within(list).getAllByRole('link').map((link) => link.textContent)).toEqual(['Fazendas Norte']);
  });

  it('o login não leva a ela se houver outra disponível', async () => {
    stubFakeApi({ session: blocked });
    const app = renderApp('/');

    expect(await screen.findByRole('heading', { level: 1, name: 'Fazendas Norte' })).toBeInTheDocument();
    expect(app.pathname()).toBe('/e/fazendas-norte');
  });
});
