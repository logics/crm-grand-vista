import { expect, test, type Page } from '@playwright/test';
import { twoTenantUser } from './support/accounts.js';

const [first, second] = twoTenantUser.tenants;

async function login(page: Page) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'E-mail' }).fill(twoTenantUser.email);
  await page.getByLabel('Senha').fill(twoTenantUser.password);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

const tenantHeading = (page: Page, name: string) => page.getByRole('heading', { level: 1, name });

test('duas abas em duas empresas diferentes funcionam ao mesmo tempo, sem interferir uma na outra', async ({
  context,
}) => {
  const tabA = await context.newPage();
  await login(tabA);
  await expect(tenantHeading(tabA, first.name)).toBeVisible();
  await expect(tabA).toHaveURL(`/e/${first.slug}`);

  // Mesma sessão (mesmo cookie), outra empresa: a empresa vem da URL, não da sessão.
  const tabB = await context.newPage();
  await tabB.goto(`/e/${second.slug}`);
  await expect(tenantHeading(tabB, second.name)).toBeVisible();

  // Abrir a segunda empresa não mudou a primeira aba, nem no servidor.
  await tabA.reload();
  await expect(tenantHeading(tabA, first.name)).toBeVisible();

  // Trocar de empresa numa aba não arrasta a outra.
  await tabB.getByRole('combobox', { name: 'Empresa' }).click();
  await tabB.getByRole('option', { name: first.name }).click();
  await expect(tenantHeading(tabB, first.name)).toBeVisible();
  await tabA.getByRole('combobox', { name: 'Empresa' }).click();
  await tabA.getByRole('option', { name: second.name }).click();
  await expect(tenantHeading(tabA, second.name)).toBeVisible();

  await tabB.reload();
  await expect(tenantHeading(tabB, first.name)).toBeVisible();
  await expect(tabB).toHaveURL(`/e/${first.slug}`);
});
