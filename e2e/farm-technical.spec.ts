import { expect, test, type Page } from '@playwright/test';
import { twoTenantUser } from './support/accounts.js';
import { login } from './support/fixtures.js';

const [tenant] = twoTenantUser.tenants;

async function chooseMunicipality(page: Page) {
  await page.getByRole('combobox', { name: /Município/ }).click();
  await page.getByPlaceholder('Buscar município').fill('Rio Verde');
  await page.getByRole('option', { name: /Rio Verde.*GO/ }).first().click();
}

test('preenche o técnico, troca a aptidão e vê no histórico; sair sujo pergunta', async ({ page }) => {
  await login(page, twoTenantUser);
  await expect(page).toHaveURL(`/e/${tenant.slug}`);
  await page.goto(`/e/${tenant.slug}/farms/new`);

  await page.getByRole('textbox', { name: /^Nome/ }).fill('Fazenda Técnica E2E');
  await chooseMunicipality(page);
  await page.getByRole('textbox', { name: /Área total/ }).fill('500');

  await page.getByRole('combobox', { name: 'Aptidões' }).click();
  await page.getByRole('option', { name: 'Agricultura' }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('combobox', { name: 'Disponibilidade hídrica' }).click();
  await page.getByRole('option', { name: 'Alta' }).click();
  await page.getByRole('textbox', { name: /Distância até a rodovia/ }).fill('12,5');
  await page.getByRole('combobox', { name: /Situação documental/ }).click();
  await page.getByRole('option', { name: 'Pendente' }).click();
  await page.getByRole('textbox', { name: /Observação documental/ }).fill('CAR em retificação');
  await page.getByRole('textbox', { name: /Latitude/ }).fill('-17.7923');
  await page.getByRole('textbox', { name: /Longitude/ }).fill('-50.92');
  await page.getByRole('button', { name: 'Cadastrar fazenda' }).click();

  await expect(page).toHaveURL(/\/farms\/[0-9a-f-]{36}$/);
  await expect(page.getByText('CAR em retificação')).toBeVisible();
  await expect(page.getByText('12,5 km')).toBeVisible();
  await expect(page.getByText('Agricultura').first()).toBeVisible();

  // troca a aptidão: sai Agricultura, entra Pecuária
  await page.getByRole('button', { name: 'Editar' }).click();
  await page.getByRole('combobox', { name: 'Aptidões' }).click();
  await page.getByRole('option', { name: 'Agricultura' }).click();
  await page.getByRole('option', { name: 'Pecuária' }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page).toHaveURL(/\/farms\/[0-9a-f-]{36}$/);

  await expect(page.getByText('Aptidão adicionada: Pecuária')).toBeVisible();
  await expect(page.getByText('Aptidão removida: Agricultura')).toBeVisible();

  // formulário sujo: navegar pelo menu pergunta
  await page.getByRole('button', { name: 'Editar' }).click();
  await page.getByRole('textbox', { name: /^Nome/ }).fill('Outro nome');
  await page.getByRole('button', { name: 'Fazendas' }).click();
  await expect(page.getByRole('dialog', { name: 'Sair sem salvar?' })).toBeVisible();
});
