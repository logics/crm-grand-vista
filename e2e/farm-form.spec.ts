import { expect, test, type Page } from '@playwright/test';
import { TRADING_POST_NAME, twoTenantUser } from './support/accounts.js';
import { login } from './support/fixtures.js';

const [tenant] = twoTenantUser.tenants;
const corretor = () => twoTenantUser.name;

/** O município vem da busca por termo: digita-se para a lista trazer o Rio Verde. */
async function chooseMunicipality(page: Page) {
  await page.getByRole('combobox', { name: /Município/ }).click();
  await page.getByPlaceholder('Buscar município').fill('Rio Verde');
  await page.getByRole('option', { name: /Rio Verde.*GO/ }).first().click();
}

test.beforeEach(async ({ page }) => {
  await login(page, twoTenantUser);
  await expect(page).toHaveURL(`/e/${tenant.slug}`);
  await page.goto(`/e/${tenant.slug}/farms/new`);
});

test('a praça do cadastro aparece no seletor e é sugerida pelo município', async ({ page }) => {
  await page.getByRole('combobox', { name: /Praça/ }).click();
  await expect(page.getByRole('option', { name: TRADING_POST_NAME })).toBeVisible();
  await page.keyboard.press('Escape');

  await chooseMunicipality(page);
  await expect(page.getByRole('combobox', { name: /Praça/ })).toContainText(TRADING_POST_NAME);
});

test('o corretor responsável limpo não trava: dá para escolher de novo', async ({ page }) => {
  const field = page.getByRole('combobox', { name: /Corretor responsável/ });
  await expect(field).toContainText(corretor());

  await field.click();
  await page.getByRole('option', { name: new RegExp(corretor()) }).click();
  await expect(field).not.toContainText('Carregando');

  await field.click();
  await page.getByRole('option', { name: new RegExp(corretor()) }).click();
  await expect(field).toContainText(corretor());
});

test('a validação aponta os obrigatórios e a área útil maior que a total', async ({ page }) => {
  await page.getByRole('button', { name: 'Cadastrar fazenda' }).click();
  await expect(page.getByText('Informe o nome.')).toBeVisible();
  await expect(page.getByText('Informe o município.')).toBeVisible();
  await expect(page.getByText('Informe a área total.')).toBeVisible();
  await expect(page).toHaveURL(/\/farms\/new$/);

  await page.getByRole('textbox', { name: /Nome/ }).fill('Fazenda E2E');
  await chooseMunicipality(page);
  await page.getByRole('textbox', { name: /Área total/ }).fill('100');
  await page.getByRole('textbox', { name: /Área útil/ }).fill('200');
  await page.getByRole('button', { name: 'Cadastrar fazenda' }).click();
  await expect(page.getByText('A área útil não pode ser maior que a área total.')).toBeVisible();
  await expect(page).toHaveURL(/\/farms\/new$/);
});

test('duas fazendas com o mesmo nome no mesmo município: o segundo cadastro avisa e só salva com confirmação', async ({ page }) => {
  // O banco do E2E é reaproveitado entre execuções: o nome é único por rodada.
  const name = `Fazenda Duplicada ${Date.now()}`;
  const fill = async (value: string) => {
    await page.getByRole('textbox', { name: /Nome/ }).fill(value);
    await chooseMunicipality(page);
    await page.getByRole('textbox', { name: /Área total/ }).fill('100');
    await page.getByRole('button', { name: 'Cadastrar fazenda' }).click();
  };

  await fill(name);
  await expect(page).toHaveURL(new RegExp(`/e/${tenant.slug}/farms/[0-9a-f-]{36}$`));

  await page.goto(`/e/${tenant.slug}/farms/new`);
  await fill(name.toUpperCase());

  const warning = page.getByRole('alert', { name: 'Possível fazenda duplicada' });
  await expect(warning).toBeVisible();
  await expect(warning.getByText('mesmo nome no mesmo município')).toBeVisible();
  await expect(page).toHaveURL(/\/farms\/new$/);
  await expect(page.getByRole('textbox', { name: /Nome/ })).toHaveValue(name.toUpperCase());

  await page.getByRole('button', { name: 'Salvar mesmo assim' }).click();
  await expect(page).toHaveURL(new RegExp(`/e/${tenant.slug}/farms/[0-9a-f-]{36}$`));
});
