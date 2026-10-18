import { expect, test } from '@playwright/test';

test('a aplicação abre na tela de login', async ({ page }) => {
  await page.goto('/login');

  await expect(page).toHaveTitle('CRM Grand Vista');
  await expect(page.getByRole('heading', { name: 'Entrar no CRM' })).toBeVisible();
});
