import { expect, test } from '@playwright/test';

test('a aplicação abre', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('CRM Grand Vista');
  await expect(page.getByRole('heading', { name: 'CRM Grand Vista' })).toBeVisible();
});
