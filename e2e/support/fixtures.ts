// Passos e localizadores compartilhados pelos testes E2E.
import type { Page } from '@playwright/test';

/** Entra pela tela de login. */
export async function login(page: Page, { email, password }: { email: string; password: string }) {
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
