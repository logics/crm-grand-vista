import { expect, test, type Page } from '@playwright/test';
import { twoTenantUser } from './support/accounts.js';
import { login } from './support/fixtures.js';
import { e2eEnv } from './support/test-env.js';

const [tenant] = twoTenantUser.tenants;
const API = `${e2eEnv.API_URL}/e/${tenant.slug}`;
const RIO_VERDE_IBGE = '5218805';

/** Cadastra pela API da sessão do navegador; o nome é único para não colidir com outras execuções. */
async function createFarm(page: Page, name: string) {
  const response = await page.request.post(`${API}/farms`, {
    data: { name, municipalityIbgeCode: RIO_VERDE_IBGE, totalAreaHa: '100' },
  });
  expect(response.status()).toBe(201);
  return ((await response.json()) as { id: string }).id;
}

/**
 * Desativar é trocar o status comercial para o de significado Desativada. O
 * formulário ainda não tem o campo (vem com a edição manual do status), então
 * a troca vai pela API, que já a aceita.
 */
async function deactivate(page: Page, id: string) {
  const options = await page.request.get(`${API}/settings/vocabularies/commercial-statuses/options`);
  const items = ((await options.json()) as { items: { id: string; systemMeaning?: string }[] }).items;
  const status = items.find((item) => item.systemMeaning === 'inactive');
  expect(status).toBeDefined();
  const response = await page.request.patch(`${API}/farms/${id}`, { data: { commercialStatusId: status!.id } });
  expect(response.status()).toBe(200);
}

test.beforeEach(async ({ page }) => {
  await login(page, twoTenantUser);
  await expect(page).toHaveURL(`/e/${tenant.slug}`);
});

test('fazenda desativada some da lista e é excluída digitando o nome', async ({ page }) => {
  const name = `Fazenda a excluir ${Date.now()}`;
  const id = await createFarm(page, name);

  await page.goto(`/e/${tenant.slug}/farms`);
  await expect(page.getByText(name)).toBeVisible();

  await deactivate(page, id);
  await page.goto(`/e/${tenant.slug}/farms`);
  await expect(page.getByRole('heading', { name: /Fazendas/ }).first()).toBeVisible();
  await expect(page.getByText(name)).toHaveCount(0);

  await page.goto(`/e/${tenant.slug}/farms/${id}`);
  await page.getByRole('button', { name: 'Excluir' }).click();
  const dialog = page.getByRole('dialog');
  const confirm = dialog.getByRole('button', { name: 'Excluir' });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel('Digite o nome da fazenda para confirmar').fill(name);
  await expect(confirm).toBeEnabled();
  await confirm.click();

  await expect(page).toHaveURL(`/e/${tenant.slug}/farms`);
  expect((await page.request.get(`${API}/farms/${id}`)).status()).toBe(404);
});

test('fazenda que não está desativada mostra a explicação, sem excluir', async ({ page }) => {
  const id = await createFarm(page, `Fazenda disponível ${Date.now()}`);

  await page.goto(`/e/${tenant.slug}/farms/${id}`);
  await page.getByRole('button', { name: 'Excluir' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Desative a fazenda antes de excluir.')).toBeVisible();
  await expect(dialog.getByRole('textbox')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Entendi' }).click();

  expect((await page.request.get(`${API}/farms/${id}`)).status()).toBe(200);
});
