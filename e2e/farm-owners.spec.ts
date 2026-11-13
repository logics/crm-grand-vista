import { expect, test, type Page } from '@playwright/test';
import { OWNER_NAMES, twoTenantUser } from './support/accounts.js';
import { login } from './support/fixtures.js';

const [tenant] = twoTenantUser.tenants;
const [maria, joao] = OWNER_NAMES;

async function addOwner(page: Page, name: string) {
  await page.getByRole('button', { name: 'Adicionar proprietário' }).click();
  await page.getByRole('combobox', { name: 'Novo proprietário' }).click();
  await page.getByRole('option', { name: new RegExp(name) }).click();
}

test('cadastra fazenda com dois proprietários, troca o principal e vê a seção na ficha do contato', async ({ page }) => {
  await login(page, twoTenantUser);
  await expect(page).toHaveURL(`/e/${tenant.slug}`);
  await page.goto(`/e/${tenant.slug}/farms/new`);

  await page.getByRole('textbox', { name: /Nome/ }).fill('Fazenda dos Irmãos E2E');
  await page.getByRole('combobox', { name: /Município/ }).click();
  await page.getByPlaceholder('Buscar município').fill('Rio Verde');
  await page.getByRole('option', { name: /Rio Verde.*GO/ }).first().click();
  await page.getByRole('textbox', { name: /Área total/ }).fill('500');
  await addOwner(page, maria);
  await addOwner(page, joao);
  await expect(page.getByRole('checkbox', { name: `Proprietário principal: ${maria}` })).toBeChecked();
  await page.getByRole('button', { name: 'Cadastrar fazenda' }).click();

  await expect(page).toHaveURL(/\/farms\/[0-9a-f-]{36}$/);
  await expect(page.getByText(`${maria} (principal), ${joao}`)).toBeVisible();

  await page.getByRole('button', { name: 'Editar' }).click();
  await page.getByRole('checkbox', { name: `Proprietário principal: ${joao}` }).click();
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByText(`${joao} (principal), ${maria}`).or(page.getByText(`${maria}, ${joao} (principal)`))).toBeVisible();
  await expect(page.getByText('Proprietário principal alterado').first()).toBeVisible();

  await page.goto(`/e/${tenant.slug}/contacts`);
  await page.getByText(joao).first().click();
  const section = page.locator('[data-section="farms"]');
  await expect(section.getByRole('link', { name: 'Fazenda dos Irmãos E2E' })).toBeVisible();
  await expect(section.getByText('Principal')).toBeVisible();
});
