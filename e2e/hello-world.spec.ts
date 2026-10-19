// O "hello world" autenticado, teste de ponta a ponta da Fase 0: raiz sem
// sessão → login → empresa padrão do vínculo → usuário e empresa na tela →
// logout. Roda no CI a cada pull request, contra o banco semeado.
import { expect, test } from '@playwright/test';
import { twoTenantUser } from './support/accounts.js';
import { accountMenu, login, tenantHeading } from './support/fixtures.js';

const [defaultTenant] = twoTenantUser.tenants;
const tenantRoot = `/e/${defaultTenant.slug}`;

test('login leva à empresa padrão, com usuário e empresa na tela, e o logout volta ao login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL('/login');

  await login(page, twoTenantUser);
  await expect(page).toHaveURL(tenantRoot);
  await expect(tenantHeading(page, defaultTenant.name)).toBeVisible();
  await expect(page.getByRole('main')).toContainText(twoTenantUser.name);
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();

  // Com mais de um vínculo, o menu de conta oferece a troca de empresa.
  await accountMenu(page, twoTenantUser.name).click();
  await expect(page.getByRole('group', { name: 'Empresa' })).toBeVisible();

  await page.getByRole('option', { name: 'Sair' }).click();
  await expect(page).toHaveURL('/login');

  // A sessão acabou de fato: a empresa leva de volta ao login.
  await page.goto(tenantRoot);
  await expect(page).toHaveURL('/login');
});
