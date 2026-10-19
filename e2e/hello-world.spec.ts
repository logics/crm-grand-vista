// O "hello world" autenticado, teste de ponta a ponta da Fase 0. Roda contra o
// ambiente local (`pnpm test:e2e`) e contra produção
// (`pnpm test:e2e:production`), com a conta de cada um.
import { accountMenu, expect, login, tenantHeading, test } from './support/fixtures.js';

test('login leva à empresa padrão, com usuário e empresa na tela, e o logout volta ao login', async ({
  page,
  account,
}) => {
  const tenantRoot = `/e/${account.tenant.slug}`;

  // Sem sessão, a raiz leva ao login.
  await page.goto('/');
  await expect(page).toHaveURL('/login');

  await login(page, account);
  await expect(page).toHaveURL(tenantRoot);
  await expect(tenantHeading(page, account.tenant.name)).toBeVisible();
  await expect(page.getByRole('main')).toContainText(account.name);
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();

  // Abrir a empresa direto na URL, sem navegar até ela: o redirecionamento de SPA entrega a aplicação.
  await page.goto(tenantRoot);
  await expect(tenantHeading(page, account.tenant.name)).toBeVisible();

  await accountMenu(page, account.name).click();
  await page.getByRole('option', { name: 'Sair' }).click();
  await expect(page).toHaveURL('/login');

  // A sessão acabou de fato: a empresa leva de volta ao login.
  await page.goto(tenantRoot);
  await expect(page).toHaveURL('/login');
});
