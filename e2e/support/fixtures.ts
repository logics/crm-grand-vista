// `test` do E2E com a conta que entra no CRM como opção do Playwright: no
// local, a usuária semeada (`accounts.ts`); contra produção, a conta de
// verificação do environment (`playwright.production.config.ts`). O mesmo
// teste roda nos dois.
import { test as base, type Page } from '@playwright/test';
import { twoTenantUser } from './accounts.js';

export interface E2EAccount {
  name: string;
  email: string;
  password: string;
  /** A empresa padrão do vínculo, aonde o login leva. */
  tenant: { slug: string; name: string };
}

export interface AccountOptions {
  account: E2EAccount;
}

const [defaultTenant] = twoTenantUser.tenants;

export const seededAccount: E2EAccount = {
  name: twoTenantUser.name,
  email: twoTenantUser.email,
  password: twoTenantUser.password,
  tenant: { slug: defaultTenant.slug, name: defaultTenant.name },
};

export const test = base.extend<AccountOptions>({
  account: [seededAccount, { option: true }],
});

export { expect } from '@playwright/test';

/** Entra pela tela de login. */
export async function login(page: Page, { email, password }: Pick<E2EAccount, 'email' | 'password'>) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'E-mail' }).fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

/** O título da topbar: o nome da empresa ativa. */
export const tenantHeading = (page: Page, name: string) => page.getByRole('heading', { level: 1, name });

/** O menu de conta da topbar, pelo nome do usuário no gatilho. */
export const accountMenu = (page: Page, userName: string) =>
  page.getByRole('button', { name: new RegExp(userName) });
