import { expect, test, type Page } from '@playwright/test';
import { twoTenantUser } from './support/accounts.js';
import { login } from './support/fixtures.js';

const [tenant] = twoTenantUser.tenants;

async function createFarm(page: Page, name: string, aptitude: string) {
  await page.goto(`/e/${tenant.slug}/farms/new`);
  await page.getByRole('textbox', { name: /^Nome/ }).fill(name);
  await page.getByRole('combobox', { name: /Município/ }).click();
  await page.getByPlaceholder('Buscar município').fill('Rio Verde');
  await page
    .getByRole('option', { name: /Rio Verde.*GO/ })
    .first()
    .click();
  await page.getByRole('textbox', { name: /Área total/ }).fill('500');
  // a seção Técnico nasce recolhida no cadastro novo
  await page.getByRole('button', { name: 'Preencher' }).click();
  await page.getByRole('combobox', { name: 'Aptidões' }).click();
  await page.getByRole('option', { name: aptitude }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Cadastrar fazenda' }).click();
  await expect(page).toHaveURL(/\/farms\/[0-9a-f-]{36}$/);
}

test('filtra por UF e aptidão e o link copiado reabre a mesma lista', async ({ page, context }) => {
  // O banco do E2E é reaproveitado entre execuções: os nomes são únicos por rodada.
  const run = Date.now();
  const agro = `Fazenda Filtro Agro ${run}`;
  const pasture = `Fazenda Filtro Pasto ${run}`;
  await login(page, twoTenantUser);
  await expect(page).toHaveURL(`/e/${tenant.slug}`);
  await createFarm(page, agro, 'Agricultura');
  await createFarm(page, pasture, 'Pecuária');

  await page.goto(`/e/${tenant.slug}/farms`);
  await page.getByRole('searchbox').fill(String(run));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('row', { name: new RegExp(agro) })).toBeVisible();
  await expect(page.getByRole('row', { name: new RegExp(pasture) })).toBeVisible();

  await page.getByRole('combobox', { name: 'Região' }).click();
  await page.getByPlaceholder('Buscar município ou UF').fill('Goi');
  await page.getByRole('option', { name: 'Goiás (UF)' }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Mais filtros/ }).click();
  await page.getByRole('combobox', { name: 'Aptidão' }).click();
  await page.getByRole('option', { name: 'Agricultura' }).click();
  await page.keyboard.press('Escape');

  await expect(page).toHaveURL(/region=GO/);
  await expect(page).toHaveURL(/aptitudeId=/);
  await expect(page.getByRole('row', { name: new RegExp(agro) })).toBeVisible();
  await expect(page.getByRole('row', { name: new RegExp(pasture) })).toHaveCount(0);

  // o link copiado, aberto em outra aba, reabre a mesma lista com os controles preenchidos
  const link = page.url();
  const reopened = await context.newPage();
  await reopened.goto(link);
  await expect(reopened.getByRole('row', { name: new RegExp(agro) })).toBeVisible();
  await expect(reopened.getByRole('row', { name: new RegExp(pasture) })).toHaveCount(0);
  await expect(reopened.getByRole('combobox', { name: 'Região' })).toContainText(/GO|Goiás/);
  await reopened.getByRole('button', { name: /Mais filtros/ }).click();
  await expect(reopened.getByRole('combobox', { name: 'Aptidão' })).toContainText('Agricultura');
});
