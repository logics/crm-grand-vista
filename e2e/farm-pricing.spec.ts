import { expect, test, type Page } from '@playwright/test';
import { CROP_NAME, twoTenantUser } from './support/accounts.js';
import { login } from './support/fixtures.js';

const [tenant] = twoTenantUser.tenants;

async function chooseMunicipality(page: Page) {
  await page.getByRole('combobox', { name: /Município/ }).click();
  await page.getByPlaceholder('Buscar município').fill('Rio Verde');
  await page.getByRole('option', { name: /Rio Verde.*GO/ }).first().click();
}

test('avaliação em sacas por alqueire, troca para reais e a mudança no histórico', async ({ page }) => {
  await login(page, twoTenantUser);
  await expect(page).toHaveURL(`/e/${tenant.slug}`);
  await page.goto(`/e/${tenant.slug}/farms/new`);

  await page.getByRole('textbox', { name: /Nome/ }).fill('Fazenda Precificada');
  await chooseMunicipality(page);
  await page.getByRole('textbox', { name: /Área total/ }).fill('1000');

  await page.getByRole('combobox', { name: 'Modo de precificação' }).click();
  await page.getByRole('option', { name: 'Em sacas' }).click();
  await page.getByRole('textbox', { name: /Avaliação em sacas/ }).fill('7000');
  await page.getByRole('combobox', { name: 'Unidade da avaliação' }).click();
  await page.getByRole('option', { name: 'Por alqueire' }).click();
  await expect(page.getByRole('combobox', { name: 'Tipo de alqueire da avaliação' })).toContainText('Goiano');
  await page.getByRole('combobox', { name: /Cultura de referência/ }).click();
  await page.getByRole('option', { name: CROP_NAME }).click();
  await page.getByRole('button', { name: 'Cadastrar fazenda' }).click();

  await expect(page.getByRole('heading', { name: 'Fazenda Precificada' })).toBeVisible();
  await expect(page.getByText('7.000 sacas por alqueire goiano')).toBeVisible();
  await expect(page.getByText('Sacas por hectare')).toBeVisible();
  await expect(page.getByText('1.446,28 sacas')).toBeVisible();

  await page.getByRole('button', { name: 'Editar' }).click();
  await page.getByRole('combobox', { name: 'Modo de precificação' }).click();
  await page.getByRole('option', { name: 'Em reais' }).click();
  await page.getByRole('button', { name: 'Trocar modo' }).click();
  await page.getByRole('textbox', { name: /Preço pedido/ }).fill('8000000000');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();

  await expect(page.getByText('R$ 80.000.000,00')).toBeVisible();
  await expect(page.getByText('Valor por hectare', { exact: true })).toBeVisible();
  await expect(page.getByText('Modo de precificação')).toBeVisible();
  await expect(page.getByText('Em sacas').first()).toBeVisible();
});

test('abrir e salvar sem tocar em nada não gera entrada nova no histórico', async ({ page }) => {
  await login(page, twoTenantUser);
  await page.goto(`/e/${tenant.slug}/farms/new`);
  await page.getByRole('textbox', { name: /Nome/ }).fill('Fazenda Sem Deriva');
  await chooseMunicipality(page);
  await page.getByRole('textbox', { name: /Área total/ }).fill('48.4');
  await page.getByRole('button', { name: 'Cadastrar fazenda' }).click();
  await expect(page.getByRole('heading', { name: 'Fazenda Sem Deriva' })).toBeVisible();
  await expect(page.getByText('Preço não informado')).toBeVisible();

  await page.getByRole('button', { name: 'Editar' }).click();
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByRole('heading', { name: 'Fazenda Sem Deriva' })).toBeVisible();
  await expect(page.getByText('Área total alterada')).toHaveCount(0);
});
