// Fumaça sem credencial: roda no CI contra o ambiente local e, depois de cada
// deploy, contra produção (`playwright.production.config.ts`). Não usa conta
// nem grava nada no banco — prova só que o front publicado está de pé e
// alcança a API.
import { expect, test } from '@playwright/test';
import { INVALID_CREDENTIALS_MESSAGE } from '../packages/shared/src/auth.js';
import { login } from './support/fixtures.js';

test('a aplicação abre na tela de login', async ({ page }) => {
  await page.goto('/login');

  await expect(page).toHaveTitle('CRM Grand Vista');
  await expect(page.getByRole('heading', { name: 'Entrar no CRM' })).toBeVisible();
});

test('página de empresa aberta direto pela URL entrega a aplicação, que leva ao login', async ({ page }) => {
  // Sem o redirecionamento de SPA, o CDN responderia 404 e a aplicação nem carregaria.
  await page.goto('/e/qualquer-empresa/farms/123');

  await expect(page).toHaveURL('/login');
  await expect(page.getByRole('heading', { name: 'Entrar no CRM' })).toBeVisible();
});

test('o front alcança a API: credencial inexistente é recusada pela API, não por erro de rede', async ({ page }) => {
  // `.invalid` é reservado (RFC 2606): nunca existe conta com este e-mail.
  await login(page, { email: 'verificacao@crm.invalid', password: 'senha-que-nao-existe' });

  await expect(page.getByText(INVALID_CREDENTIALS_MESSAGE)).toBeVisible();
});
