// @vitest-environment jsdom
import '../../support/dom.js';
import { INVALID_CREDENTIALS_MESSAGE } from '@crm/shared';
import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { session, stubFakeApi } from '../../support/fake-api.js';
import { renderApp } from '../../support/render-app.js';

const account = {
  email: 'ana@grandvista.com.br',
  password: 'senha-correta',
  session: session({
    tenants: [
      { slug: 'fazendas-norte', name: 'Fazendas Norte', isDefault: false, blocked: false },
      { slug: 'grand-vista', name: 'Grand Vista', isDefault: true, blocked: false },
    ],
  }),
};

async function fillLogin(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(await screen.findByRole('textbox', { name: 'E-mail' }), email);
  if (password) await user.type(screen.getByLabelText('Senha'), password);
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('tela de login', () => {
  it('sem sessão, a raiz leva ao login', async () => {
    stubFakeApi();
    const app = renderApp('/');

    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument();
    expect(app.pathname()).toBe('/login');
  });

  it('sem sessão, uma página de empresa também leva ao login', async () => {
    stubFakeApi();
    const app = renderApp('/e/grand-vista');

    await screen.findByRole('button', { name: 'Entrar' });
    expect(app.pathname()).toBe('/login');
  });

  it('valida e-mail e senha pelo `loginSchema`, sem chamar a API', async () => {
    const api = stubFakeApi({ account });
    renderApp('/login');

    await fillLogin('ana', '');

    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'E-mail' })).toHaveAccessibleDescription('Informe um e-mail válido.'),
    );
    expect(screen.getByLabelText('Senha')).toHaveAccessibleDescription('Informe a senha.');
    expect(api.requests.filter((request) => request.path === '/auth/login')).toEqual([]);
  });

  it.each([
    ['e-mail sem conta', 'outro@grandvista.com.br', account.password],
    ['senha errada', account.email, 'senha-errada'],
  ])('credencial inválida (%s) mostra a mesma mensagem', async (_case, email, password) => {
    stubFakeApi({ account });
    const app = renderApp('/login');

    await fillLogin(email, password);

    expect(await screen.findByRole('alert')).toHaveTextContent(INVALID_CREDENTIALS_MESSAGE);
    expect(app.pathname()).toBe('/login');
  });

  it('falha do servidor não se passa por credencial inválida', async () => {
    stubFakeApi({ account, loginFails: true });
    renderApp('/login');

    await fillLogin(account.email, account.password);

    const alert = await screen.findByRole('alert');
    expect(alert).not.toHaveTextContent(INVALID_CREDENTIALS_MESSAGE);
    expect(alert).toHaveTextContent('Não foi possível entrar agora.');
  });

  it('login válido leva à empresa padrão do usuário', async () => {
    stubFakeApi({ account });
    const app = renderApp('/login');

    await fillLogin(account.email, account.password);

    expect(await screen.findByRole('heading', { level: 1, name: 'Grand Vista' })).toBeInTheDocument();
    expect(app.pathname()).toBe('/e/grand-vista');
  });

  it('manda o cookie de sessão em toda requisição à API', async () => {
    const api = stubFakeApi({ account });
    renderApp('/login');

    await fillLogin(account.email, account.password);
    await screen.findByRole('heading', { level: 1, name: 'Grand Vista' });

    expect(api.requests.length).toBeGreaterThan(0);
    for (const request of api.requests) expect(request.init?.credentials).toBe('include');
  });

  it('com sessão aberta, o login leva direto à empresa padrão', async () => {
    stubFakeApi({ session: account.session });
    const app = renderApp('/login');

    await screen.findByRole('heading', { level: 1, name: 'Grand Vista' });
    expect(app.pathname()).toBe('/e/grand-vista');
  });

  it('logout encerra a sessão na API e volta à tela de login', async () => {
    const api = stubFakeApi({ session: account.session });
    const app = renderApp('/e/grand-vista');

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Sair' }));

    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument();
    expect(app.pathname()).toBe('/login');
    expect(api.requests).toContainEqual(expect.objectContaining({ method: 'POST', path: '/auth/logout' }));

    await app.router.navigate('/e/grand-vista');
    await waitFor(() => expect(app.pathname()).toBe('/login'));
  });
});
